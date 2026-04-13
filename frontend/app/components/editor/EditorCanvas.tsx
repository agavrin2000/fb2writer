/**
 * @fileoverview Компонент холста редактора, отображающего содержимое TipTap.
 * Обеспечивает визуальный контейнер для редактора с адаптивным поведением и оптимизированной перерисовкой.
 * Использует React.memo для предотвращения избыточного рендеринга при неизменном редакторе.
 */

"use client";
import { EditorContent, Editor } from "@tiptap/react";
import React from "react";

/**
 * Внутренний компонент рендера холста редактора.
 * Отображает редактор TipTap внутри стилизованного контейнера с возможностью фокусировки.
 *
 * При отсутствии экземпляра редактора показывает заглушку с серым фоном.
 * Клик по области контента устанавливает фокус в редактор.
 *
 * @param props - Свойства компонента.
 * @param props.editor - Экземпляр редактора TipTap. Может быть `null` на этапе инициализации.
 * @param ref - Пробрасываемый ref на внешний контейнер (HTMLDivElement).
 *
 * @example
 * <EditorCanvas editor={editorInstance} />
 */
const EditorCanvasRender = ({
  ref,
  editor,
}: { editor: Editor | null } & {
  ref: React.RefObject<HTMLDivElement>;
}) => {
  // Если editor еще не инициализирован, возвращаем заглушку,
  // чтобы не ломать дерево рендеринга
  if (!editor) return <div ref={ref} className="grow bg-gray-200" />;

  return (
    <div
      ref={ref}
      className="grow overflow-y-auto bg-gray-200 py-2 custom-scrollbar"
    >
      <div className="w-[90%] min-w-[80%] max-w-[800px] mx-auto bg-white shadow-2xl rounded-sm border border-gray-300 relative">
        <div
          className="p-[60px_10%] pb-[70vh]"
          onClick={() => editor?.chain().focus().run()}
        >
          <EditorContent
            editor={editor}
            className="prose prose-slate max-w-none focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Оптимизированный компонент холста редактора.
 * Обёртка над {@link EditorCanvasRender}, предотвращающая перерисовку при неизменном `editor`.
 *
 * Использует `React.memo` с кастомной функцией сравнения, проверяющей строгое равенство объекта редактора.
 * Это критично для производительности, так как редактор — тяжёлый компонент.
 *
 * @component
 * @param {Object} props - Входные параметры компонента.
 * @param {Editor | null} props.editor - Экземпляр редактора TipTap.
 *
 * @displayName EditorCanvas
 */
export const EditorCanvas = React.memo(
  EditorCanvasRender,
  (prev, next) => prev.editor === next.editor,
);

EditorCanvas.displayName = "EditorCanvas";
EditorCanvasRender.displayName = "EditorCanvasRender";
