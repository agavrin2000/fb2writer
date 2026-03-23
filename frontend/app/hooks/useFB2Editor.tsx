"use client";

import { useRef, useMemo, RefObject, useCallback } from "react";
import { useEditor, Editor } from "@tiptap/react";
import { Transaction } from "@tiptap/pm/state";
import { EditorExtensions } from "@/components/editor/EditorExtensions";
import { collectNodes } from "@/utils/utils";
import { useTOC } from "./useTOC";
import { createEditorProps } from "../components/editor/createEditorProps";
import {TocItem, ActiveNote, FootnotesMap} from "@/types/types"

export const useFB2Editor = (
  footnotesRef: RefObject<FootnotesMap>,
  setActiveNoteRef: RefObject<(note: ActiveNote | null) => void>,
) => {
  // 1. Логика оглавления (TOC)
  const {
    tocTree,
    activeHeadingPos,
    setActiveHeadingPos,
    flatNodesRef,
    updateActiveHeading,
    debouncedSetToc,
  } = useTOC();

  // Используем реф для функции обновления заголовка,
  // чтобы onUpdate/onSelectionUpdate всегда видели свежую версию без пересоздания опций редактора
  const updateActiveHeadingRef = useRef(updateActiveHeading);
  updateActiveHeadingRef.current = updateActiveHeading;

  // 2. Вынесенные пропсы (обработка кликов по сноскам)
  const editorProps = useMemo(
    () => createEditorProps(footnotesRef, setActiveNoteRef),
    [footnotesRef, setActiveNoteRef],
  );

  // 3. Конфигурация событий и опций редактора
  const editorOptions = useMemo(
    () => ({
      extensions: EditorExtensions,
      content: "<p>Загрузка...</p>",
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
        // Если текст не менялся (только курсор) — ничего не делаем
        if (!transaction.docChanged) return;

        // Быстрый сбор структуры документа (~1-2мс на больших файлах)
        const nodes = collectNodes(editor.state.doc);
        flatNodesRef.current = nodes;

        // Тяжелый рендер React-дерева оглавления и поиск активной главы выносим в следующий кадр
        requestAnimationFrame(() => {
          debouncedSetToc(nodes);
          updateActiveHeadingRef.current(editor);
        });
      },

      // Обработка перемещения курсора / выделения
      onSelectionUpdate: ({ editor }: { editor: Editor }) => {
        // Только обновляем подсветку текущей главы в Sidebar
        updateActiveHeadingRef.current(editor);
      },
    }),
    [editorProps, debouncedSetToc, flatNodesRef], // flatNodesRef здесь константный, но для порядка добавлен
  );

  // 4. Инициализация Tiptap
  const editor = useEditor(editorOptions);

  const scrollToHeading = useCallback(
    (item: TocItem) => {

        if (!editor || !item.id) return;

      editor.chain().focus().setTextSelection(item.pos).run();

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
      editor?.commands.focus();
    },
    [editor],
  );

  return {
    editor,
    tocTree,
    activeHeadingPos,
    setActiveHeadingPos,
    scrollToHeading,
  };
};
