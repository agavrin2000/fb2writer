'use client';
import { EditorContent, Editor } from '@tiptap/react';
import React from 'react';

export const EditorCanvas = React.forwardRef<HTMLDivElement, { editor: Editor | null }>(({ editor }, ref) => (
    <div ref={ref} className="flex-grow overflow-y-auto bg-gray-200 py-2 scroll-smooth custom-scrollbar">
        {/* Контейнер листа: 
            w-[90%] — занимает 90% ширины экрана
            max-w-[1200px] — не дает строке стать слишком длинной на 4K мониторах
            min-w-[80%] — гарантирует 80% ширины
        */}
        <div className="w-[90%] min-w-[80%] max-w-[1200px] mx-auto bg-white shadow-2xl rounded-sm border border-gray-300 relative">
            <div className="p-[60px_10%] pb-[70vh]">
                <EditorContent editor={editor} className="prose prose-slate max-w-none focus:outline-none p-16" />
            </div>
        </div>
    </div>
));
EditorCanvas.displayName = 'EditorCanvas';
