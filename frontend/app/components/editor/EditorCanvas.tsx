'use client';
import { EditorContent, Editor } from '@tiptap/react';
import React from 'react';

// 1. Сначала объявляем компонент с forwardRef
const EditorCanvasRender = React.forwardRef<HTMLDivElement, { editor: Editor | null }>(
  ({ editor }, ref) => {
    // Если editor еще не инициализирован, возвращаем заглушку, 
    // чтобы не ломать дерево рендеринга
    if (!editor) return <div ref={ref} className="grow bg-gray-200" />;

    return (
      <div ref={ref} className="grow overflow-y-auto bg-gray-200 py-2 custom-scrollbar">
        <div className="w-[90%] min-w-[80%] max-w-[800px] mx-auto bg-white shadow-2xl rounded-sm border border-gray-300 relative">
          <div className="p-[60px_10%] pb-[70vh]">
            <EditorContent 
              editor={editor} 
              className="prose prose-slate max-w-none focus:outline-none" 
            />
          </div>
        </div>
      </div>
    );
  }
);

// 2. Оборачиваем в memo с кастомным сравнением. 
// Мы говорим React: "Не перерисовывай этот тяжелый UI, если объект редактора тот же самый"
export const EditorCanvas = React.memo(
  EditorCanvasRender,
  (prev, next) => prev.editor === next.editor
);

EditorCanvas.displayName = 'EditorCanvas';
