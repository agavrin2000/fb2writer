import { BubbleMenu } from '@tiptap/react/menus';
import React from 'react';
import { Editor } from '@tiptap/react';

interface ImageBubbleMenuProps {
  editor: Editor | null;
}

export const ImageBubbleMenu: React.FC<ImageBubbleMenuProps> = ({ editor }) => {
  if (!editor) return null;

  return (
    <BubbleMenu 
      editor={editor} 
      shouldShow={({ editor }) => editor.isActive('image')}
    >
      <div className="flex bg-white border border-gray-200 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <button 
          onClick={() => editor.chain().focus().deleteSelection().run()} 
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-colors"
        >
          Удалить изображение
        </button>
      </div>
    </BubbleMenu>
  );
};
