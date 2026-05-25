"use client";

import { useRef, useMemo, RefObject, useCallback, useLayoutEffect, useEffect } from "react";
import { useEditor, Editor } from "@tiptap/react";
import { Transaction } from "@tiptap/pm/state";
import { getEditorExtensions } from "@/components/editor/EditorExtensions";
import { collectNodes } from "@/utils/utils";
import { useTOC } from "./useTOC";
import { createEditorProps } from "@/components/editor/createEditorProps";
import { TocItem, ActiveNote, FootnotesMap, createInitialContent } from "@/types/types";
import type { NSpell } from 'nspell';   // Импортируем тип для useState

/**
 * Хук для инициализации и управления Tiptap-редактором с расширенными возможностями, специфичными для FB2.
 *
 * Объединяет в себе:
 * - Инициализацию редактора с кастомными расширениями и обработчиками.
 * - Поддержку динамического оглавления (TOC) с отслеживанием активного заголовка.
 * - Обработку кликов по сноскам через переданные рефы.
 * - Плавный скролл к заголовкам по клику из оглавления.
 *
 * @param footnotesRef - Реф, указывающий на объект с данными всех сносок (`Record<string, JSONContent>`).
 *                       Используется для отображения контента сноски при клике.
 * @param setActiveNoteRef - Реф, указывающий на функцию установки активной сноски.
 *                           Вызывается с объектом `{ id, x, y }` или `null`.
 *
 * @returns Объект, содержащий:
 * - `editor` — экземпляр Tiptap-редактора.
 * - Методы управления оглавлением: `debouncedSetToc`, `updateActiveHeading`, `flatNodesRef`, `lastFlatNodes`.
 * - `scrollToHeading` — функция для плавного скролла к указанному заголовку.
 *
 * @example
 * ```tsx
 * const footnotesRef = useRef<Record<string, JSONContent>>({});
 * const setActiveNoteRef = useRef<(note: ActiveNote | null) => void>(() => {});
 *
 * const { editor, scrollToHeading } = useFB2Editor(footnotesRef, setActiveNoteRef);
 * ```
 *
 * @remarks
 * Хук использует `useLayoutEffect` для безопасного обновления мутабельной ссылки `updateActiveHeadingRef`,
 * чтобы избежать лишних пересозданий колбэков редактора. Это позволяет поддерживать актуальную логику
 * обновления активного заголовка без необходимости повторной инициализации редактора.
 */
export const useFB2Editor = (
  footnotesRef: RefObject<FootnotesMap>,
  setActiveNoteRef: RefObject<(note: ActiveNote | null) => void>,
  spellInstance: NSpell | null, 
  userExceptions: Set<string>
) => {
  // 1. Логика оглавления (TOC)
  const { ...tocMethods } = useTOC();
  const { debouncedSetToc, updateActiveHeading, flatNodesRef, lastFlatNodes } =
    tocMethods;

  // Используем реф для функции обновления заголовка,
  // чтобы onUpdate/onSelectionUpdate всегда видели свежую версию без пересоздания опций редактора
  const updateActiveHeadingRef = useRef(updateActiveHeading);

  // 2. Обновляем его значение внутри эффекта (БЕЗОПАСНО)
  useLayoutEffect(() => {
    updateActiveHeadingRef.current = updateActiveHeading;
  }); // Без массива зависимостей, чтобы обновлять при каждом рендере

  // 2. Вынесенные пропсы (обработка кликов по сноскам)
  const editorProps = useMemo(
    () => createEditorProps(footnotesRef, setActiveNoteRef),
    [footnotesRef, setActiveNoteRef],
  );

  const extensions = useMemo(() =>
    getEditorExtensions({
      spellchecker: spellInstance, // ваш стейт экземпляра nspell
      exceptions: userExceptions   // ваш стейт Set<string> исключений
    }),
    [spellInstance, userExceptions] // пересобираем массив при обновлении словарей
  );

  // 4. Инициализация Tiptap
  const editor = useEditor(
    {
      extensions: extensions,
      content: createInitialContent().content,
      immediatelyRender: false,
      editorProps: editorProps,
      enableInputRules: false,
      enablePasteRules: false,

      // Обработка изменений контента
      onUpdate: ({
        editor,
        transaction,
      }: {
        editor: Editor;
        transaction: Transaction;
      }) => {
        // Если документ изменился — пересобираем структуру (TOC)
        if (transaction.docChanged) {
          const nodes = collectNodes(editor.state.doc);
          flatNodesRef.current = nodes;

          // Сравниваем текущую структуру с предыдущей (быстрая проверка)
          const currentCheck = nodes
            .map((n) => `${n.level}:${n.text}`)
            .join("|");

          if (currentCheck !== lastFlatNodes.current) {
            // Только если изменился текст заголовка или его уровень — дергаем дебаунс
            // ОБЯЗАТЕЛЬНО обновляем реф СРАЗУ, чтобы следующий ввод символа
            // увидел, что структура уже в очереди на обновление и не сбрасывал дебаунс зря
            lastFlatNodes.current = currentCheck;
            debouncedSetToc(nodes);
          }
        }
      },

      // Обработка перемещения курсора / выделения
      onSelectionUpdate: ({ editor }: { editor: Editor }) => {
        // Только обновляем подсветку текущей главы в Sidebar
        updateActiveHeadingRef.current(editor);
      },

      // Вызывается при первоначальном создании редактора
      onCreate: ({ editor }: { editor: Editor }) => {
        // При создании редактора сразу обновляем подсветку текущей главы
        const nodes = collectNodes(editor.state.doc);
        flatNodesRef.current = nodes;
        debouncedSetToc(nodes);
        updateActiveHeadingRef.current(editor);
      },
    },
    [spellInstance, userExceptions],
  );

useEffect(() => {
  if (editor && !editor.isDestroyed && spellInstance) {
    // 🔥 Исправленный синтаксис обновления опций расширения:
    // Мы явно указываем имя расширения через свойство .name
    editor.extensionManager.extensions.forEach((extension) => {
      if (extension.name === 'customSpellcheck') {
        extension.options.spellchecker = spellInstance;
        extension.options.exceptions = userExceptions;
      }
    });
    
    // Заставляем ProseMirror полностью пересчитать декорации (подсветку) в документе
    editor.view.dispatch(editor.state.tr);
  }
}, [spellInstance, userExceptions, editor]);

  /**
   * Выполняет плавный скролл к указанному заголовку в редакторе.
   *
   * @param item - Объект заголовка из оглавления (тип {@link TocItem}), содержащий `id`, `pos`, `level`, `text`.
   *               Поле `id` обязательно для навигации.
   *
   * @remarks
   * Функция:
   * 1. Устанавливает фокус в редактор и перемещает курсор на позицию заголовка.
   * 2. Находит DOM-элемент по `id` и прокручивает к нему с поведением `smooth`.
   * 3. Через 300мс выполняет дополнительную прокрутку с поведением `auto` для коррекции позиции,
   *    если после основной анимации содержимое страницы изменилось (например, подгрузились изображения).
   */
  const scrollToHeading = useCallback(
    (item: TocItem) => {
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
    },
    [editor],
  );

  return { editor, ...tocMethods, scrollToHeading };
};