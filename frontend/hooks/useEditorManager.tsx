import { useState, useCallback, useMemo, useRef } from "react";
import { JSONContent } from "@tiptap/core";
import { Editor, useEditorState } from "@tiptap/react";
import { EditorState } from "@tiptap/pm/state";
import { useFB2Editor } from "./useFB2Editor";
import { useFootnotes, Footnotes } from "./useFootnotes";
import { usePhotinoEvents } from "./usePhotinoEvents";
import { getFileName } from "../utils/utils";
import { photino } from "../services/photino";
import { useConfirm } from "./ConfirmContext";
import { useToast } from "./ToastContext";
import {
  Fb2Data,
  TocItem,
  createInitialContent,
  FootnotesMap,
  ImageDisplayType,
  ActiveNote,
} from "../types/types";

interface EditorActions {
  save: () => Promise<void> | void;
  exportEpub: () => Promise<void> | void;
  open: () => Promise<void> | void;
  selectImage: (type: ImageDisplayType) => void;
  addFootnote: (id?: string) => void;
  addLink: () => void;
  newFile: () => void;
  exitApp: () => void;
  undo: () => void;
  redo: () => void;
}

interface EditorManager {
  editor: Editor | null; // Замените any на тип вашего редактора (например, Editor | null)
  notes: Footnotes;
  isLoading: boolean;
  loaderConfig: { title?: string; subtitle?: string } | null;
  loadingFileName: string;
  currentFilePath: string;
  tocTree: TocItem[];
  actions: EditorActions;
  scrollToHeading: (item: TocItem) => void;
}

/**
 * Хук для управления редактором FB2-документов.
 * Объединяет функциональность редактора, метаданных, сносок и взаимодействия с бэкендом через Photino.
 *
 * @returns {Object} Объект с состоянием редактора, метаданными, флагами загрузки и действиями.
 */
export function useEditorManager(): EditorManager {
  const confirm = useConfirm();
  const { success: showToastSuccess, error: showToastError } = useToast();

  // --- РЕФЫ И СОСТОЯНИЕ ---
  /**
   * Ссылка на текущий объект сносков.
   * Используется для прямого доступа к данным сносок из внешних колбэков.
   */
  const footnotesRef = useRef<Record<string, JSONContent>>({});

  /**
   * Ссылка на функцию установки активной сноски.
   * Позволяет обновлять состояние активной сноски из любого места.
   */
  const setActiveNoteRef = useRef<(note: ActiveNote | null) => void>(() => { });

  /**
   * Флаг состояния загрузки.
   * Указывает, выполняется ли в данный момент операция загрузки или сохранения.
   */
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Имя файла, участвующего в текущей операции.
   * Отображается в интерфейсе во время загрузки/сохранения.
   *
   */
  const [loadingFileName, setLoadingFileName] = useState("");

  /**
   * Текущий путь к файлу.
   * Пусто для нового документа, содержит путь после открытия/сохранения.
   */
  const [currentFilePath, setCurrentFilePath] = useState<string>(
    createInitialContent().filePath,
  );

  /**
   * Конфигурация компонента загрузки.
   * Определяет отображаемый заголовок и подзаголовок индикатора прогресса.
   */
  const [loaderConfig, setLoaderConfig] = useState<{
    title?: string;
    subtitle?: string;
  } | null>(null);

  // 1. Сначала инициализируем Редактор
  const fb2 = useFB2Editor(footnotesRef, setActiveNoteRef);
  /**
   * Проверяет, были ли изменения в содержимом редактора.
   * Основано на возможности отмены действий в Tiptap.
   * @returns {boolean} `true`, если есть несохранённые изменения в тексте.
   */
  /*const isContentDirty = useMemo(() => {
    return fb2.editor?.can().undo() ?? false;
  }, [fb2.editor?.state.doc]); // Пересчитываем при каждом изменении документа*/

  const isDirty = useEditorState({
    editor: fb2.editor,
    selector: (ctx): boolean => {
      // Если редактора нет, то и истории нет
      if (!ctx.editor) return false;

      // Вызываем проверку возможности Undo
      return ctx.editor.can().undo();
    },
  });
  // 2. Инициализируем Сноски
  const notes = useFootnotes(fb2.editor, footnotesRef, setActiveNoteRef);

  /**
   * Очищает историю отмены/повтора в редакторе.
   * Создаёт новое состояние редактора с тем же документом, но без истории.
   */
  const clearHistory = useCallback(() => {
    if (!fb2.editor) return;

    // 1. Сбрасываем данные в хранилище расширения вручную
    const { view, state } = fb2.editor;

    const newState = EditorState.create({
      doc: state.doc,
      plugins: state.plugins,
      selection: state.selection,
      storedMarks: state.storedMarks,
    });

    // Обновляем состояние в представлении
    view.updateState(newState);
  }, [fb2.editor]);

  // --- ОБРАБОТЧИКИ СОБЫТИЙ (Incoming) ---
  /**
   * Обрабатывает событие получения содержимого FB2-документа из бэкенда.
   * Загружает метаданные, контент, сноски и настраивает редактор.
   * @param {string} payload - JSON-строка с данными документа.
   */
  const onFb2Content = useCallback(
    (payload: string | object | null) => {
      if (!fb2.editor || !payload) return;

      let data: Fb2Data;
      if (typeof payload === "string") {
        try {
          data = JSON.parse(payload);
        } catch (e) {
          console.error("Failed to parse Fb2Data:", e);
          return;
        }
      } else {
        data = payload as Fb2Data;
      }

      if (data.content) {
        fb2.editor.commands.setContent(data.content);
      }
      if (data.metadata) {
        fb2.editor.commands.updateMetadata(data.metadata || {});
      }
      clearHistory();
      if (data.footnotes) {
        notes.setFootnotes(data.footnotes);
        if (footnotesRef.current) footnotesRef.current = data.footnotes;
      } else {
        notes.setFootnotes({});
      }

      // Устанавливаем курсор в позицию 0 (начало документа) и фокусируем редактор, чтобы сработали события onUpdate/onSelectionUpdate
      fb2.editor.commands.focus("start");

      setCurrentFilePath(data.filePath ?? "");
      setLoadingFileName("");
      setIsLoading(false);
      setLoaderConfig(null);
    },
    [
      fb2.editor,
      clearHistory,
      setCurrentFilePath,
      setLoadingFileName,
      setIsLoading,
      setLoaderConfig,
      notes,
    ],
  );

  /**
   * Обрабатывает событие выбора изображения пользователем.
   * Вставляет изображение в редактор в зависимости от указанного типа отображения.
   * @param {string} payload - JSON-строка с данными изображения (src, href, display).
   */
  const onImageSelected = useCallback(
    (payload: string | object | null) => {
      try {
        const imageData =
          typeof payload === "string" ? JSON.parse(payload) : payload;
        if (!imageData?.data) return; // Защита от пустых данных

        setIsLoading(false);
        setLoaderConfig(null);

        if (!fb2.editor) return;

        // Создаем цепочку
        const commandChain = fb2.editor.chain().focus();

        // Выбираем нужную команду в рамках ОДНОЙ цепочки
        if (imageData.display === "block") {
          commandChain.insertFb2BlockImage({
            src: imageData.data,
            href: imageData.href,
          });
        } else if (imageData.display === "inline") {
          commandChain.insertFb2InlineImage({
            src: imageData.data,
            href: imageData.href,
          });
        } else if (imageData.display === "section") {
          commandChain.insertFb2SectionImage({
            src: imageData.data,
            href: imageData.href,
          });
        }

        // ВЫПОЛНЯЕМ цепочку
        commandChain.run();
      } catch (error) {
        console.error("Ошибка обработки изображения:", error);
        showToastError("Ошибка при вставке изображения");
      }
    },
    [fb2.editor, setIsLoading, setLoaderConfig, showToastError],
  );

  /**
   * Обрабатывает начало процесса загрузки файла.
   * Активирует индикатор загрузки и устанавливает соответствующее сообщение.
   * @param {string} name - Имя файла, который будет загружен.
   */
  const onStartLoading = useCallback(
    (payload: string | object | null) => {
      if (!payload || typeof payload !== "string") return;
      setIsLoading(true);
      setLoaderConfig({
        title: "Загрузка книги",
        subtitle: "Парсинг XML и извлечение Binary",
      });
      setLoadingFileName(payload || "Загрузка...");
    },
    [setLoadingFileName, setIsLoading, setLoaderConfig],
  );

  /**
   * Обрабатывает начало процесса сохранения файла.
   * Активирует индикатор сохранения и устанавливает имя файла.
   */
  const onStartSaving = useCallback(() => {
    setIsLoading(true);
    setLoaderConfig({
      title: "Сохранение книги",
      subtitle: "Формирование XML",
    });
    setLoadingFileName(getFileName(currentFilePath));
  }, [setLoadingFileName, setIsLoading, setLoaderConfig, currentFilePath]);

  /**
   * Обрабатывает начало процесса сохранения файла.
   * Активирует индикатор сохранения и устанавливает имя файла.
   */
  const onStartExporting = useCallback(() => {
    setIsLoading(true);
    setLoaderConfig({
      title: "Экспорт",
      subtitle: "Формирование EPUB",
    });
  }, [setIsLoading, setLoaderConfig]);

  /**
   * Обрабатывает отмену процесса загрузки.
   * Деактивирует индикатор загрузки и сбрасывает состояние.
   */
  const onCancelLoading = useCallback(() => {
    setIsLoading(false);
    setLoaderConfig(null);
    setLoadingFileName("");
  }, [setLoadingFileName, setIsLoading, setLoaderConfig]);

  /**
   * Обрабатывает успешное сохранение файла.
   * Обновляет эталонные данные, сбрасывает флаги изменений и показывает уведомление.
   * @param {any} newFilePath - Новый путь к сохранённому файлу.
   */
  const onSaveSuccess = useCallback(
    (payload: object | string | null) => {
      if (!payload || typeof payload !== "string") return;

      // 1. Сохраняем КЛОН объекта, чтобы разорвать связь с текущим стейтом
      clearHistory();
      setCurrentFilePath(payload);
      setLoadingFileName("");
      setIsLoading(false);
      setLoaderConfig(null);
      showToastSuccess("Изменения сохранены");
    },
    [
      clearHistory,
      setCurrentFilePath,
      setLoadingFileName,
      setIsLoading,
      setLoaderConfig,
      showToastSuccess,
    ],
  );

  /**
   * Обрабатывает ошибку, возникшую в бэкенде.
   * Показывает уведомление с сообщением об ошибке.
   * @param {string} message - Текст сообщения об ошибке.
   */
  const onError = useCallback(
    (payload: object | string | null) => {
      if (!payload || typeof payload !== "string") return;
      setIsLoading(false);
      setLoaderConfig(null);
      setLoadingFileName("");
      showToastError(payload);
    },
    [setLoadingFileName, setIsLoading, setLoaderConfig, showToastError],
  );
  /**
   * Проверяет, можно ли безопасно продолжить операцию с учётом несохранённых изменений.
   * Показывает диалог подтверждения, если документ изменён.
   * @returns {Promise<boolean>} `true`, если операцию можно продолжить.
   */

  const ensureSafeToProceed = useCallback(async () => {
    // Если правок нет — сразу разрешаем
    if (!isDirty) return true;

    // Вызываем диалог и принудительно приводим результат к Boolean (!!),
    // чтобы исключить undefined, если реф пустой
    const confirmed = await confirm.ask(
      "Несохраненные изменения",
      "У вас есть несохраненные изменения. Продолжить без сохранения?",
      "danger",
    );

    return confirmed;
  }, [isDirty, confirm]);

  /**
   * Выход из приложения.
   * Перед выходом проверяет наличие несохранённых изменений.
   */
  const exitApp = useCallback(async () => {
    const canProceed = await ensureSafeToProceed();
    if (!canProceed) return;
    photino.send("close-app");
  }, [ensureSafeToProceed]);

  // Обработка закрытия окна по "крестику"
  const onShowExitConfirmation = useCallback(async () => {
    exitApp();
  }, [exitApp]);

  /**
   * Объект с обработчиками событий, получаемых от Photino.
   * Каждый ключ соответствует имени события, значение — функция-обработчик.
   */
  const eventHandlers = useMemo(
    () => ({
      "fb2-content": onFb2Content,
      "image-selected": onImageSelected,
      "start-loading": onStartLoading,
      "cancel-loading": onCancelLoading,
      "start-saving": onStartSaving,
      "start-exporting": onStartExporting,
      "save-success": onSaveSuccess,
      "show-exit-confirmation": onShowExitConfirmation,
      error: onError,
    }),
    [
      onFb2Content,
      onImageSelected,
      onStartLoading,
      onCancelLoading,
      onStartSaving,
      onSaveSuccess,
      onStartExporting,
      onShowExitConfirmation,
      onError,
    ],
  );

  usePhotinoEvents(eventHandlers);

  // --- МЕТОДЫ ДЕЙСТВИЙ (Outgoing) ---

  /**
   * Сохраняет текущий документ в файл.
   * Если `saveAs` истинно или путь не задан, открывается диалог выбора места сохранения.
   * Перед сохранением очищает неиспользуемые сноски.
   * @param {boolean} [saveAs=false] - Если `true`, принудительно открывает диалог "Сохранить как".
   */
  const saveFile = useCallback(
    (saveAs: boolean = false) => {
      if (!fb2.editor || isLoading) return;

      setLoaderConfig({
        title: "Сохранение...",
        subtitle:
          saveAs || !currentFilePath
            ? "Выбор пути сохранения"
            : "Запись данных на диск",
      });
      setIsLoading(true);

      // Очистка сносок на которые нет сыылок в тексте документа
      const usedIds = new Set<string>();
      fb2.editor.state.doc.descendants((node) => {
        const linkMark = node.marks.find(
          (m) => m.type.name === "link" && m.attrs.rel === "footnote",
        );
        if (linkMark) {
          const id = linkMark.attrs.href?.replace("#", "");
          if (id) usedIds.add(id);
        }
      });

      const actualFootnotes = Object.keys(notes.footnotes)
        .filter((id) => usedIds.has(id))
        .reduce((acc, id) => {
          acc[id] = notes.footnotes[id];
          return acc;
        }, {} as FootnotesMap);

      const json = fb2.editor.getJSON();
      // Удаляем meta 
      const cleanJson = JSON.parse(JSON.stringify(json, (key, value) =>
        key === 'meta' ? undefined : value
      ));

      const payload = {
        content: cleanJson,
        footnotes: actualFootnotes,
        metadata: fb2.editor.storage.metadata.meta,
        filePath: saveAs ? "" : currentFilePath,
      };

      // Сериализуем в строку перед отправкой
      photino.send("save-file", payload);
    },
    [
      fb2.editor,
      isLoading,
      notes,
      currentFilePath,
      setLoaderConfig,
      setIsLoading,
    ],
  );

  /**
   * Сохраняет текущий документ в файл.
   * Если `saveAs` истинно или путь не задан, открывается диалог выбора места сохранения.
   * Перед сохранением очищает неиспользуемые сноски.
   * @param {boolean} [saveAs=false] - Если `true`, принудительно открывает диалог "Сохранить как".
   */
  const exportEpub = useCallback(() => {
    if (!fb2.editor || isLoading) return;

    setLoaderConfig({
      title: "Экспорт...",
      subtitle: "Экспорт в формат Epub3. Подождите...",
    });
    setIsLoading(true);

    // Очистка сносок на которые нет сыылок в тексте документа
    const usedIds = new Set<string>();
    fb2.editor.state.doc.descendants((node) => {
      const linkMark = node.marks.find(
        (m) => m.type.name === "link" && m.attrs.rel === "footnote",
      );
      if (linkMark) {
        const id = linkMark.attrs.href?.replace("#", "");
        if (id) usedIds.add(id);
      }
    });

    const actualFootnotes = Object.keys(notes.footnotes)
      .filter((id) => usedIds.has(id))
      .reduce((acc, id) => {
        acc[id] = notes.footnotes[id];
        return acc;
      }, {} as FootnotesMap);

    const json = fb2.editor.getJSON();
    // Удаляем meta 
    const cleanJson = JSON.parse(JSON.stringify(json, (key, value) =>
      key === 'meta' ? undefined : value
    ));

    const payload = {
      content: cleanJson,
      footnotes: actualFootnotes,
      metadata: fb2.editor.storage.metadata.meta,
      filePath: "",
    };

    // Сериализуем в строку перед отправкой
    photino.send("export-epub", payload);
  }, [fb2.editor, isLoading, notes, setLoaderConfig, setIsLoading]);

  /**
   * Открывает диалог выбора файла для загрузки.
   * Перед этим проверяет наличие несохранённых изменений.
   */
  const openFile = useCallback(async () => {
    if (isLoading) return;
    const canProceed = await ensureSafeToProceed();
    if (!canProceed) return;
    setIsLoading(true);
    setLoaderConfig({ title: "Загрузка книги", subtitle: "Выбор файла" });
    setLoadingFileName("");

    photino.send("open-file");
  }, [
    isLoading,
    ensureSafeToProceed,
    setLoadingFileName,
    setIsLoading,
    setLoaderConfig,
  ]);

  /**
   * Открывает системный диалог для выбора изображения.
   * @param {"block" | "inline" | "section"} [type="block"] - Тип вставки изображения.
   */
  const selectImage = useCallback(
    (type: "block" | "inline" | "section" = "block") => {
      if (isLoading) return;
      setIsLoading(true);
      setLoaderConfig({
        title: "Выбор изображения",
        subtitle: "Открытие системного диалога...",
      });
      // Отправляем объект с данными, чтобы бэкенд знал, какой тип вставки использовать
      photino.send("select-image", { type });
    },
    [isLoading, setIsLoading, setLoaderConfig],
  );

  /**
   * Применяет ссылку к выделенному тексту.
   * Если ничего не выделено, не делает ничего.
   * После применения генерирует событие для активации BubbleMenu.
   */
  const addLink = useCallback(() => {
    if (!fb2.editor) return;
    const { empty } = fb2.editor.state.selection;
    if (empty) return;

    // Устанавливаем "пустую" ссылку.
    // Это активирует марку link, и BubbleMenu тут же всплывет для ввода URL.
    fb2.editor
      .chain()
      .extendMarkRange("link") // Чтобы не плодить вложенные ссылки
      .setLink({
        href: "", // Пустое значение, чтобы заполнил пользователь в BubbleMenu
        target: null,
        rel: "noopener noreferrer",
      })
      .run();
    window.dispatchEvent(new CustomEvent("fb2-force-link-focus"));
  }, [fb2.editor]);

  /**
   * Создаёт новый пустой документ.
   * Перед созданием проверяет наличие несохранённых изменений.
   */
  const createNewFile = useCallback(async () => {
    const canProceed = await ensureSafeToProceed();
    if (!canProceed) return;
    // Сбрасываем имя файла в заголовке окна приложения
    photino.send("set-file-name", "Новая книга");

    onFb2Content(createInitialContent());
  }, [onFb2Content, ensureSafeToProceed]);

  // --- ИТОГОВЫЙ ОБЪЕКТ ---
  return {
    editor: fb2.editor,
    isLoading,
    loadingFileName,
    currentFilePath,
    loaderConfig,
    tocTree: fb2.tocTree,
    notes,
    actions: {
      save: saveFile,
      exportEpub: exportEpub,
      open: openFile,
      selectImage: selectImage,
      addFootnote: notes.addFootnote,
      addLink,
      newFile: createNewFile,
      exitApp: exitApp,
      undo: () => fb2.editor?.chain().undo().run(),
      redo: () => fb2.editor?.chain().redo().run(),
    },
    scrollToHeading: fb2.scrollToHeading,
  };
}
