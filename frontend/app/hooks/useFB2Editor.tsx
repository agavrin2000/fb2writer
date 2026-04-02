"use client";

import { useRef, useMemo, RefObject, useCallback, useEffect } from "react";
import { useEditor, Editor } from "@tiptap/react";
import { Transaction } from "@tiptap/pm/state";
import { EditorExtensions } from "@/components/editor/EditorExtensions";
import { collectNodes } from "@/utils/utils";
import { useTOC } from "./useTOC";
import { createEditorProps } from "../components/editor/createEditorProps";
import { TocItem, ActiveNote, FootnotesMap, EMPTY_FB2_TEMPLATE } from "@/types/types";
import { Selection } from "@tiptap/pm/state";
import { EditorState } from "@tiptap/pm/state";

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
        // 1. Проверяем, изменился ли документ ИЛИ изменилось ли выделение (курсор)
        const isDocChanged = transaction.docChanged;
        const isSelectionChanged = transaction.selectionSet;

        // Если вообще ничего не произошло — выходим
        if (!isDocChanged && !isSelectionChanged) return;

        // 2. Если документ изменился — пересобираем структуру (TOC)
        if (isDocChanged) {
          const nodes = collectNodes(editor.state.doc);
          flatNodesRef.current = nodes;
          debouncedSetToc(nodes);
        }

        // 3. Обновляем активную главу (это нужно и при вводе, и при простом движении курсора)
        requestAnimationFrame(() => {
          updateActiveHeadingRef.current(editor);
        });
      },
      // Обработка перемещения курсора / выделения
      onSelectionUpdate: ({ editor }: { editor: Editor }) => {
        // Только обновляем подсветку текущей главы в Sidebar
        updateActiveHeadingRef.current(editor);
      },
      /*onCreate({ editor }: { editor: Editor }) {
        const { view, state } = editor;

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
      },*/
    }),
    [editorProps, debouncedSetToc, updateActiveHeadingRef, flatNodesRef], // flatNodesRef здесь константный, но для порядка добавлен
  );

  // 4. Инициализация Tiptap
  const editor = useEditor(editorOptions);

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
      editor.view.dispatch(state.tr.setSelection(selection));

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
