"use client";

import { useEditor } from "@tiptap/react";
import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  RefObject,
} from "react";
import { photino } from "../../api/photino";
import { EditorView } from "@tiptap/pm/view";
import { Editor } from "@tiptap/react";
import { Transaction } from "@tiptap/pm/state";
import { EditorExtensions } from "../schema";
import { collectNodes } from "../../utils/utils";
import { useTOC } from "./useTOC";
import { useFootnotes } from "./useFootnotes";
import { Toast, ToastHandle } from "../../components/toast";

export const useFB2Editor = (
  footnotesRef: RefObject<Record<string, any>>,
  setActiveNoteRef: RefObject<(note: any) => void>,
) => {
  console.log("RENDER");
  const toastRef = useRef<ToastHandle>(null);
  const {
    tocTree,
    activeHeadingPos,
    setActiveHeadingPos,
    flatNodesRef,
    updateActiveHeading,
    debouncedSetToc,
  } = useTOC();

  const [isLoading, setIsLoading] = useState(false);
  const [loadingFileName, setLoadingFileName] = useState("");

  const updateActiveHeadingRef = useRef(updateActiveHeading);
  updateActiveHeadingRef.current = updateActiveHeading;

  const editorProps = useMemo(
    () => ({
      handleClick: (view: EditorView, pos: number, event: MouseEvent) => {
        const { schema } = view.state;
        const node = view.state.doc.nodeAt(pos);
        const mark = node?.marks.find((m) => m.type === schema.marks.link);
        const href = (mark?.attrs.href as string) || "";

        if (mark && href.startsWith("#")) {
          const noteId = href.replace("#", "");

          // Используем .current, чтобы всегда иметь свежие данные без ререндера editor
          const noteContent = footnotesRef.current[noteId];

          if (noteContent !== undefined) {
            event.preventDefault();
            // Вызываем функцию через реф
            setActiveNoteRef.current({
              id: noteId,
              x: event.clientX,
              y: event.clientY,
            });
            return true;
          }
        }
        setActiveNoteRef.current(null);
        return false;
      },
    }),
    [],
  );

  const editorOptions = useMemo(
    () => ({
      extensions: EditorExtensions,
      content: "<p>Загрузка...</p>",
      immediatelyRender: false,
      editorProps: editorProps,

      onUpdate: ({
        editor,
        transaction,
      }: {
        editor: Editor;
        transaction: Transaction;
      }) => {
        // Если текст не менялся (только курсор) — выходим,
        // так как это покроет onSelectionUpdate ниже
        if (!transaction.docChanged) return;
        // 1. Сбор данных (Синхронно, ~1-2мс на 5МБ)
        const nodes = collectNodes(editor.state.doc);

        flatNodesRef.current = nodes;

        // 2. Тяжелый рендер React-дерева (ОТЛОЖЕННО)
        requestAnimationFrame(() => {
          debouncedSetToc(nodes);
          updateActiveHeadingRef.current(editor);
        });
      },
      onSelectionUpdate: ({ editor }: { editor: Editor }) => {
        // Для кликов и навигации используем только поиск активной главы
        // без пересбора всего дерева оглавления
        updateActiveHeadingRef.current(editor);
      },
      // ВАЖНО: добавь все зависимости здесь!
    }),
    [editorProps, debouncedSetToc],
  );

  // MAIN Editor
  const editor = useEditor(editorOptions);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      // Проверяем Ctrl+S (или Cmd+S на Mac)
      const isCtrlS = (event.ctrlKey || event.metaKey) && event.code === "KeyO";

      if (isCtrlS) {
        event.preventDefault(); // Предотвращаем системное сохранение страницы
        if (editor) {
          openFile;
        }
      }
    };

    // Другие мелкие обработчики
    const onStartLoading = (payload: string) => {
      setIsLoading(true);
      setLoadingFileName(payload || "Обработка...");
    };

    const onInsertImage = (url: any) => {
      if (editor) editor.chain().focus().setImage({ src: url }).run();
    };

    const onSaveSuccess = (path: string) =>
      toastRef.current?.show("Изменения сохранены");
    const onCancelLoading = () => {
      setIsLoading(false);
      setLoadingFileName("");
    };

    const onError = (payload: any) => {
      setIsLoading(false);
      toastRef.current?.show(`Ошибка: ${payload}`);
      alert(`Ошибка: ${payload}`);
    };

    // Подписываемся на события из PhotinoBridge
    photino.on("start-loading", onStartLoading);
    photino.on("insert-image", onInsertImage);
    photino.on("error", onError);
    photino.on("save-success", onSaveSuccess);
    photino.on("cancel-loading", onCancelLoading);

    return () => {
      // Обязательно отписываемся, чтобы не было утечек памяти
      photino.off("start-loading", onStartLoading);
      photino.off("insert-image", onInsertImage);
      photino.off("error", onError);
      photino.off("save-success", onSaveSuccess);
      photino.off("cancel-loading", onCancelLoading);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editor, setIsLoading]);

  // Функции-обертки для отправки команд в C#
  const openFile = useCallback(() => {
    // Добавляем проверку, чтобы не открывать окно выбора файла дважды
    if (isLoading) return;

    photino.send("open-file", { action: "select_new" });
  }, [isLoading]);

  return {
    editor,
    tocTree,
    activeHeadingPos,
    setActiveHeadingPos,
    isLoading,
    loadingFileName,
    setIsLoading,
    openFile,
    setLoadingFileName,
  };
};
