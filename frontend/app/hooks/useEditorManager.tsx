import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useFB2Editor } from "./useFB2Editor";
import { useFootnotes } from "./useFootnotes";
import { usePhotinoEvents } from "./usePhotinoEvents";
import {
  Fb2Metadata,
  Fb2Data,
  TocItem,
  Fb2ImageData,
  EMPTY_FB2_TEMPLATE,
} from "../types/types";
import { ToastHandle } from "@/components/ui/Toast";
import { photino } from "@/api/photino";
import { NodeSelection } from "@tiptap/pm/state";
import { EditorState } from "@tiptap/pm/state";
import { ConfirmHandle } from "@/components/ui/ConfirmDialog";
import { findParentNodeByType, getFileName } from "@/utils/utils";
import { Node as ProsemirrorNode } from "@tiptap/pm/model";

export function useEditorManager(
  toastRef: React.RefObject<ToastHandle | null>,
  confirmRef: React.RefObject<ConfirmHandle | null>,
) {
  // --- РЕФЫ И СОСТОЯНИЕ ---
  const footnotesRef = useRef<Record<string, any>>({});
  const setActiveNoteRef = useRef<(note: any) => void>(() => {});

  const [metadata, setMetadata] = useState<Fb2Metadata | null>(
    EMPTY_FB2_TEMPLATE.Meta,
  );
  const [savedMeta, setSavedMeta] = useState(
    JSON.stringify(EMPTY_FB2_TEMPLATE.Meta),
  ); // Эталон в виде строки

  const [isLoading, setIsLoading] = useState(false);
  const [loadingFileName, setLoadingFileName] = useState("");
  const [currentFilePath, setCurrentFilePath] = useState<string>(
    EMPTY_FB2_TEMPLATE.FilePath,
  );
  const [isDirty, setIsDirty] = useState(false);
  const [loaderConfig, setLoaderConfig] = useState<{
    title?: string;
    subtitle?: string;
  } | null>(null);

  // 1. Сначала инициализируем Редактор (ему больше не нужны actions)
  const fb2 = useFB2Editor(footnotesRef, setActiveNoteRef);

  // 2. Инициализируем Сноски
  const notes = useFootnotes(fb2.editor, footnotesRef, setActiveNoteRef);

  // --- ОБРАБОТЧИКИ СОБЫТИЙ (Incoming) ---
  const onFb2Content = useCallback(
    (payload: string) => {
      /*const debugComparison = (originalJSON, editor) => {
  const resultJSON = editor.getJSON();

  console.log("--- СРАВНЕНИЕ КОНТЕНТА ---");
  console.log("Оригинал (JSON):", originalJSON);
  console.log("В редакторе (JSON):", resultJSON);

  // Простой способ найти отличия в строках
  const originalStr = JSON.stringify(originalJSON);
  const resultStr = JSON.stringify(resultJSON);

  if (originalStr !== resultStr) {
    console.warn("⚠️ ВНИМАНИЕ: Контент изменился при загрузке!");
    // Здесь можно использовать любую библиотеку diff или просто посмотреть глазами
  } else {
    console.log("✅ Контент идентичен.");
  }
};
*/
      const data = typeof payload === "string" ? JSON.parse(payload) : payload;
      if (!fb2.editor || !data) return;

      setMetadata(data.Meta || {});
      setSavedMeta(JSON.stringify(data.Meta || {}));

      if (data.EditorContent) {
        // 1. Устанавливаем контент без записи в историю
        fb2.editor.commands.setContent(data.EditorContent);
        clearHistory();
        //debugComparison(data.EditorContent, fb2.editor);
      }

      if (data.FilePath) {
        setCurrentFilePath(data.FilePath);
      }
      setLoadingFileName("");
      setIsDirty(false);
      setIsLoading(false);
      setLoaderConfig(null);
    },
    [fb2.editor, notes],
  );

  const onImageSelected = useCallback(
    (payload: string) => {
      const imageData =
        typeof payload === "string" ? JSON.parse(payload) : payload;
      const chain = fb2.editor.chain().focus();

      if (imageData.display === "block") {
        // Вставляем как блочный узел
        chain
          .insertContent({
            type: "fb2BlockImage",
            attrs: { src: imageData.data, href: imageData.href },
          })
          .focus()
          .run();
      } else if (imageData.display === "inline") {
        // Вставляем как строчный узел
        chain
          .focus()
          .insertContent({
            type: "fb2InlineImage",
            attrs: { src: imageData.data, href: imageData.href },
          })
          .focus()
          .run();
      } else if (imageData.display === "section") {
        const { state } = fb2.editor;

        let sectionNode = null;
        let sectionPos = -1;

        // 1. Проверяем: выделена ли сама секция?
        if (
          state.selection instanceof NodeSelection &&
          (state.selection.node.type.name === "fb2Section" ||
            state.selection.node.type.name === "fb2BodySection")
        ) {
          sectionPos = state.selection.from;
          sectionNode = state.selection.node;
        }
        // 2. Если нет — ищем родительскую секцию вверх по дереву
        else {
          // 1. Ищем ближайшего подходящего родителя вверх по дереву
          ({ node: sectionNode, pos: sectionPos } = findParentNodeByType(
            state.selection,
            ["fb2BodySection", "fb2Section"],
          ));
        }

        if (!sectionNode) return;

        // 2. Определяем позицию вставки внутри найденной секции
        let insertRelativePos = 0;

        // Находим индекс первого узла, который не является Title или Epigraph
        sectionNode.forEach((child: ProsemirrorNode, offset: number) => {
          if (
            child.type.name === "fb2Title" ||
            child.type.name === "fb2Epigraph"
          ) {
            insertRelativePos = offset + child.nodeSize;
          }
        });

        // Специальный случай для BodySection: если там есть плейсхолдер/заглушка в начале
        if (sectionNode.type.name === "fb2BodySection") {
          insertRelativePos = Math.max(insertRelativePos, 1);
        }

        // Проверяем, что находится по этой позиции
        const { node: existingNode } =
          sectionNode.childAfter(insertRelativePos);

        if (existingNode?.type.name === "fb2Blockimage") {
          toastRef?.current?.show("Изображение уже есть", "error");
          return;
        }

        // Выполняем вставку по абсолютной позиции в документе
        const absoluteInsertPos = sectionPos + 1 + insertRelativePos;

        fb2.editor
          .chain()
          .insertContentAt(absoluteInsertPos, {
            type: "fb2BlockImage",
            attrs: { src: imageData.data, href: imageData.href },
          })
          .focus(absoluteInsertPos + 1)
          .run();
      }
    },
    [fb2.editor, toastRef],
  );

  const onStartLoading = useCallback((name: string) => {
    setIsLoading(true);
    setLoaderConfig({
      title: "Загрузка книги",
      subtitle: "Парсинг XML и извлечение Binary",
    });
    setLoadingFileName(name || "Загрузка...");
  }, []);

  const onStartSaving = useCallback(() => {
    setIsLoading(true);
    setLoaderConfig({ title: "Сохранение книги", subtitle: "" });
    setLoadingFileName(getFileName(currentFilePath));
  }, []);

  const onCancelLoading = useCallback(() => {
    setIsLoading(false);
    setLoaderConfig(null);
    setLoadingFileName("");
  }, []);

  const onSaveSuccess = useCallback(
    (payload: any) => {
      // payload уже содержит "book.fb2", парсить его не нужно
      const newFileName = payload;

      setSavedMeta(JSON.stringify(metadata));
      clearHistory();
      setCurrentFilePath(newFileName);
      setLoadingFileName("");
      setIsDirty(false);
      setIsLoading(false);
      setLoaderConfig(null);

      toastRef?.current?.show("Изменения сохранены", "success");
    },
    [metadata],
  );

  const onError = useCallback((message: string) => {
    setIsLoading(false);
    setLoaderConfig(null);
    toastRef?.current?.show(message, "error");
  }, []);

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
  // Сбрасываем начальные изменения из-за переформатирования
  /*useEffect(() => {
    if (fb2.editor && !fb2.editor.isDestroyed) {
      // Даем короткую задержку, чтобы плагины закончили авто-правки
      const timer = setTimeout(() => {
        clearHistory();
        setIsDirty(false); // Начальное состояние — не "грязное"

        console.log("Initial undo cleared");
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [fb2.editor]);*/

  // Отслеживаем изменения
  useEffect(() => {
    if (!fb2.editor) return;

    const updateDirty = () => {
      // Если есть что отменять (undo) — значит, документ был изменен
      setIsDirty(fb2.editor.can().undo());
      console.log("IsDirty set true (can undo)");
    };

    fb2.editor.on("update", updateDirty);
    return () => {
      fb2.editor.off("update", updateDirty);
    };
  }, [fb2.editor]); // Зависим только от экземпляра редактора

  // --- МЕТОДЫ ДЕЙСТВИЙ (Outgoing) ---
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

  // Сохранение книги в файл
  const saveFile = useCallback(
    (saveAs: boolean = false) => {
      if (!fb2.editor || isLoading) return;

      setLoaderConfig({ title: "Сохранение...", subtitle: "Выбор файла" });
      setIsLoading(true);

      const actualFootnotes = notes.cleanupOrphanNotes();
      const payload = {
        content: fb2.editor.getJSON(),
        footnotes: actualFootnotes,
        metadata: metadata,
        FilePath: saveAs ? "" : currentFilePath,
      };

      // Сериализуем в строку перед отправкой
      photino.send("save-file", JSON.stringify(payload));
    },
    [fb2.editor, isLoading, metadata, notes],
  );

  const openFile = useCallback(async () => {
    if (isLoading) return;
    if (isDirty) {
      // 1. Вызываем кастомный диалог
      const confirmed = await confirmRef?.current?.ask(
        "Несохраненные изменения",
        "У вас есть несохраненные изменения. Продолжить без сохранения?",
        "danger",
      );

      // 2. Если пользователь нажал "Отмена" или закрыл окно — прерываем выполнение
      if (!confirmed) return;
    }

    setIsLoading(true);
    setLoaderConfig({ title: "Загрузка книги", subtitle: "Выбор файла" });
    setLoadingFileName("");

    photino.send("open-file", { action: "select_new" });
  }, [isLoading, isDirty, photino, confirmRef, loaderConfig]);

  const selectImage = useCallback(
    (type: "block" | "inline" | "section" = "block") => {
      // Отправляем объект с данными, чтобы бэкенд знал, какой тип вставки использовать
      photino.send("select-image", { type });
    },
    [],
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
    // 1. Спрашиваем подтверждение, если есть несохраненные изменения
    if (isDirty) {
      // Вызываем кастомный диалог вместо window.confirm
      const confirmed = await confirmRef?.current?.ask(
        "Несохраненные изменения",
        "У вас есть несохраненные изменения. Продолжить без сохранения?",
        "danger", // или 'default'
      );

      // Если пользователь нажал "Отмена", прерываем выполнение
      if (!confirmed) return;
    }
    onFb2Content(JSON.stringify(EMPTY_FB2_TEMPLATE));
  }, [onFb2Content, isDirty, confirmRef]);

  const handleMetaChange = (newMeta: any) => {
    setMetadata(newMeta);
    console.log("Saved meta", savedMeta);
    console.log("New meta", JSON.stringify(newMeta));
    // Сравниваем текущий объект с эталонной строкой
    if (!isDirty && JSON.stringify(newMeta) !== savedMeta) {
      setIsDirty(true);
      console.log("IsDirty set to true META");
    }
  };

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
    activeHeadingPos: fb2.activeHeadingPos,
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
