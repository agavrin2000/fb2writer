import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useFB2Editor } from "./useFB2Editor";
import { useFootnotes } from "./useFootnotes";
import { usePhotinoEvents } from "./usePhotinoEvents";
import { Fb2Metadata, EMPTY_FB2_TEMPLATE } from "../types/types";
import { getFileName } from "../utils/utils";
import { photino } from "@/api/photino";
import { EditorState } from "@tiptap/pm/state";
import isEqual from "fast-deep-equal";
import { useConfirm } from "@/hooks/ConfirmContext";
import { useToast } from "@/hooks/ToastContext";
import { FootnotesMap } from "@/types/types";

export function useEditorManager() {
  const confirm = useConfirm();
  const { success: showToastSuccess, error: showToastError } = useToast();

  // --- РЕФЫ И СОСТОЯНИЕ ---
  const footnotesRef = useRef<Record<string, any>>({});
  const setActiveNoteRef = useRef<(note: any) => void>(() => { });

  const [metadata, setMetadata] = useState<Fb2Metadata | null>(
    EMPTY_FB2_TEMPLATE.Meta,
  );
  const [savedMeta, setSavedMeta] = useState<any>(EMPTY_FB2_TEMPLATE.Meta); // Эталон в виде строки
  const [isLoading, setIsLoading] = useState(false);
  const [loadingFileName, setLoadingFileName] = useState("");
  const [currentFilePath, setCurrentFilePath] = useState<string>(
    EMPTY_FB2_TEMPLATE.FilePath,
  );

  const [loaderConfig, setLoaderConfig] = useState<{
    title?: string;
    subtitle?: string;
  } | null>(null);

  // 1. Сначала инициализируем Редактор (ему больше не нужны actions)
  const fb2 = useFB2Editor(footnotesRef, setActiveNoteRef);

  // 1. Проверяем изменения в метаданных (структурно)
  const isMetaDirty = useMemo(() => {
    return !isEqual(metadata, savedMeta);
  }, [metadata, savedMeta]);

  // 2. Проверяем изменения в тексте (через историю Tiptap или хэш контента)
  // У Tiptap есть встроенный способ, но можно по старинке через флаг истории
  const isContentDirty = useMemo(() => {
    return fb2.editor?.can().undo() ?? false;
  }, [fb2.editor?.state.doc]); // Пересчитываем при каждом изменении документа

  // 3. Итоговый флаг "грязности"
  const isDirty = isMetaDirty || isContentDirty;

  // 2. Инициализируем Сноски
  const notes = useFootnotes(fb2.editor, footnotesRef, setActiveNoteRef);

  // Очистка истории UndoRedo
  const clearHistory = useCallback(() => {
    if (!fb2.editor) return;
    const { view, state } = fb2.editor;

    // Создаем новое состояние, сохраняя текущий документ, выделение и плагины.
    // Это инициализирует плагины (включая UndoRedo) с нуля.
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
  const onFb2Content = useCallback(
    (payload: string) => {

      const data = typeof payload === "string" ? JSON.parse(payload) : payload;
      if (!fb2.editor || !data) return;

      setMetadata(data.Meta || {});
      setSavedMeta(JSON.parse(JSON.stringify(data.Meta || {})));

      if (data.EditorContent) {
        fb2.editor.commands.setContent(data.EditorContent);
        clearHistory();
        // Устанавливаем курсор в позицию 0 (начало документа) и фокусируем редактор, чтобы сработали события onUpdate/onSelectionUpdate
        if (data.Footnotes) {
          notes.setFootnotes(data.Footnotes);
          if (footnotesRef.current) footnotesRef.current = data.Footnotes;
        } else {
          notes.setFootnotes({});
        }
        fb2.editor.commands.focus("start");
      }

      if (data.FilePath) {
        setCurrentFilePath(data.FilePath);
      }
      setLoadingFileName("");
      setIsLoading(false);
      setLoaderConfig(null);
    },
    [
      fb2.editor,
      clearHistory,
      setMetadata,
      setSavedMeta,
      setCurrentFilePath,
      setLoadingFileName,
      setIsLoading,
      setLoaderConfig,
    ],
  );

  const onImageSelected = useCallback(
    (payload: string) => {
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
    [fb2.editor, setIsLoading, setLoaderConfig],
  );

  const onStartLoading = useCallback(
    (name: string) => {
      setIsLoading(true);
      setLoaderConfig({
        title: "Загрузка книги",
        subtitle: "Парсинг XML и извлечение Binary",
      });
      setLoadingFileName(name || "Загрузка...");
    },
    [setLoadingFileName, setIsLoading, setLoaderConfig],
  );

  const onStartSaving = useCallback(() => {
    setIsLoading(true);
    setLoaderConfig({ title: "Сохранение книги", subtitle: "" });
    setLoadingFileName(getFileName(currentFilePath));
  }, [setLoadingFileName, setIsLoading, setLoaderConfig]);

  const onCancelLoading = useCallback(() => {
    setIsLoading(false);
    setLoaderConfig(null);
    setLoadingFileName("");
  }, [setLoadingFileName, setIsLoading, setLoaderConfig]);

  const onSaveSuccess = useCallback(
    (newFilePath: any) => {
      // 1. Сохраняем КЛОН объекта, чтобы разорвать связь с текущим стейтом
      setSavedMeta(JSON.parse(JSON.stringify(metadata)));

      clearHistory();
      setCurrentFilePath(newFilePath);
      setLoadingFileName("");
      setIsLoading(false);
      setLoaderConfig(null);

      showToastSuccess("Изменения сохранены");
    },
    [
      metadata,
      clearHistory,
      setSavedMeta,
      setCurrentFilePath,
      setLoadingFileName,
      setIsLoading,
      setLoaderConfig,
    ],
  );

  const onError = useCallback(
    (message: string) => {
      setIsLoading(false);
      setLoaderConfig(null);
      setLoadingFileName("");
      showToastError(message);
    },
    [setLoadingFileName, setIsLoading, setLoaderConfig],
  );

  // Регистрация событий Photino
  const eventHandlers = useMemo(
    () => ({
      "fb2-content": onFb2Content,
      "image-selected": onImageSelected,
      "start-loading": onStartLoading,
      "cancel-loading": onCancelLoading,
      "start-saving": onStartSaving,
      "save-success": onSaveSuccess,
      error: onError,
    }),
    [
      onFb2Content,
      onImageSelected,
      onStartLoading,
      onCancelLoading,
      onStartSaving,
      onSaveSuccess,
    ],
  );

  usePhotinoEvents(eventHandlers);

  // --- МЕТОДЫ ДЕЙСТВИЙ (Outgoing) ---
  // Проверка что файл не менялся
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

  // Сохранение книги в файл
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
        const linkMark = node.marks.find(m => m.type.name === "link" && m.attrs.rel === "footnote");
        if (linkMark) {
          const id = linkMark.attrs.href?.replace("#", "");
          if (id) usedIds.add(id);
        }
      });

      const actualFootnotes = Object.keys(notes.footnotes)
        .filter(id => usedIds.has(id))
        .reduce((acc, id) => {
          acc[id] = notes.footnotes[id];
          return acc;
        }, {} as FootnotesMap);

      const payload = {
        content: fb2.editor.getJSON(),
        footnotes: actualFootnotes,
        metadata: JSON.parse(JSON.stringify(metadata)),
        FilePath: saveAs ? "" : currentFilePath,
      };

      // Сериализуем в строку перед отправкой
      photino.send("save-file", JSON.stringify(payload));
    },
    [
      fb2.editor,
      isLoading,
      metadata,
      notes,
      currentFilePath,
      setLoaderConfig,
      setIsLoading,
      photino,
    ],
  );

  // Выбрать файл для загрузки
  const openFile = useCallback(async () => {
    if (isLoading) return;
    const canProceed = await ensureSafeToProceed();
    if (!canProceed) return;
    setIsLoading(true);
    setLoaderConfig({ title: "Загрузка книги", subtitle: "Выбор файла" });
    setLoadingFileName("");

    photino.send("open-file", { action: "select_new" });
  }, [
    isLoading,
    photino,
    ensureSafeToProceed,
    setLoadingFileName,
    setIsLoading,
    setLoaderConfig,
  ]);

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
    [isLoading, photino, setIsLoading, setLoaderConfig],
  );

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
  }, [fb2.editor, photino]);

  const createNewFile = useCallback(async () => {
    const canProceed = await ensureSafeToProceed();
    if (!canProceed) return;

    onFb2Content(JSON.stringify(EMPTY_FB2_TEMPLATE));
  }, [onFb2Content, ensureSafeToProceed]);

  const handleMetaChange = useCallback(
    (newMeta: any) => {
      setMetadata(newMeta);
    },
    [setMetadata],
  );

  // --- ИТОГОВЫЙ ОБЪЕКТ ---
  return {
    editor: fb2.editor,
    metadata,
    handleMetaChange,
    isLoading,
    loadingFileName,
    currentFilePath,
    loaderConfig,
    tocTree: fb2.tocTree,
    notes,
    actions: {
      save: saveFile,
      open: openFile,
      selectImage: selectImage,
      addFootnote: notes.addFootnote,
      addLink,
      newFile: createNewFile,
    },
    scrollToHeading: fb2.scrollToHeading,
  };
}
