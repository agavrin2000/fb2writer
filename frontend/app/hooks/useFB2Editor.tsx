"use client";

import { useRef, useMemo, RefObject, useCallback, useEffect } from "react";
import { useEditor, Editor } from "@tiptap/react";
import { Transaction } from "@tiptap/pm/state";
import { EditorExtensions } from "@/components/editor/EditorExtensions";
import { collectNodes } from "@/utils/utils";
import { useTOC } from "./useTOC";
import { createEditorProps } from "../components/editor/createEditorProps";
import {
  TocItem,
  ActiveNote,
  FootnotesMap,
  EMPTY_FB2_TEMPLATE,
} from "@/types/types";

export const useFB2Editor = (
  footnotesRef: RefObject<FootnotesMap>,
  setActiveNoteRef: RefObject<(note: ActiveNote | null) => void>,
) => {
  // 1. Логика оглавления (TOC)
  const { ...tocMethods } = useTOC();
  const { debouncedSetToc, updateActiveHeading, flatNodesRef } = tocMethods;

  // Используем реф для функции обновления заголовка,
  // чтобы onUpdate/onSelectionUpdate всегда видели свежую версию без пересоздания опций редактора
  const updateActiveHeadingRef = useRef(updateActiveHeading);
  updateActiveHeadingRef.current = updateActiveHeading;

  // 2. Вынесенные пропсы (обработка кликов по сноскам)
  const editorProps = useMemo(
    () => createEditorProps(footnotesRef, setActiveNoteRef),
    [footnotesRef, setActiveNoteRef]
  );

  // 4. Инициализация Tiptap
  const editor = useEditor({
    extensions: EditorExtensions,
    content: EMPTY_FB2_TEMPLATE.EditorContent,
    immediatelyRender: false,
    editorProps: editorProps,
    // Обработка изменений контента
    onUpdate: ({
      editor,
      transaction,
    }: {
      editor: Editor;
      transaction: Transaction;
    }) => {
      // 2. Если документ изменился — пересобираем структуру (TOC)
      if (transaction.docChanged) {
        const nodes = collectNodes(editor.state.doc);
        flatNodesRef.current = nodes;
        debouncedSetToc(nodes);
      }
    },
    // Обработка перемещения курсора / выделения
    onSelectionUpdate: ({ editor }: { editor: Editor }) => {
      // Только обновляем подсветку текущей главы в Sidebar
      updateActiveHeadingRef.current(editor);
    },
    onCreate: ({ editor }: { editor: Editor }) => {
      // При создании редактора сразу обновляем подсветку текущей главы
      const nodes = collectNodes(editor.state.doc);
      flatNodesRef.current = nodes;
      debouncedSetToc(nodes);
      updateActiveHeadingRef.current(editor);
    },
  }, []);
  /* Старый вариант
    const scrollToHeading = useCallback(
      (item: TocItem) => {
        if (!editor || !item.id) return;
  
        const { state, view } = editor;
        const { doc } = state;
  
        // Пытаемся найти ближайшую валидную позицию для курсора
        // Используем статический метод Selection.near
        const resolvedPos = doc.resolve(item.pos);
        const selection = Selection.near(resolvedPos);
  
        // Применяем выделение через транзакцию
        view.dispatch(state.tr.setSelection(selection));
  
        // Фокусируем редактор
        editor.commands.focus();
  
        let attempts = 0;
        const maxAttempts = 15;
  
        const stabilize = () => {
          const element = document.getElementById(item.id);
          if (element) {
            element.scrollIntoView({
              behavior: attempts === 0 ? "smooth" : "auto",
              block: "start",
            });
  
            if (attempts < maxAttempts) {
              attempts++;
              setTimeout(stabilize, 100);
            }
          }
        };
  
        requestAnimationFrame(stabilize);
      }, [editor]);
  */
  const scrollToHeading = useCallback((item: TocItem) => {
    if (!editor || !item.id) return;

    // 1. Переносим фокус и курсор
    editor.commands.focus();
    editor.commands.setTextSelection(item.pos);

    // 2. Находим элемент по ID
    const element = document.getElementById(item.id);

    if (element) {
      // 3. Просто вызываем скролл. 
      // Благодаря CSS scroll-margin-top, браузер сам остановится на 80px выше элемента.
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      // Однократная проверка через 300мс на случай подгрузки тяжелых картинок
      setTimeout(() => {
        element.scrollIntoView({ behavior: "auto", block: "start" });
      }, 300);
    }
  }, [editor]);
  
  return { editor, ...tocMethods, scrollToHeading };
};
