'use client';
import { EditorContent, Editor } from '@tiptap/react';
import React from 'react';

export const EditorCanvas = React.forwardRef<HTMLDivElement, { editor: Editor | null }>(({ editor }, ref) => (
    <div ref={ref} className="flex-1 overflow-y-auto bg-[#f0f0f0] p-8 flex justify-center scroll-smooth">
        <div className="bg-white shadow-2xl w-full max-w-3xl min-h-full border border-gray-200">
            <EditorContent editor={editor} className="prose prose-slate max-w-none focus:outline-none p-16" />
        </div>
    </div>
));
EditorCanvas.displayName = 'EditorCanvas';
