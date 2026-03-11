import { Editor } from '@tiptap/react';
import React from 'react';

interface ToolbarProps {
  editor: Editor | null;
  onSelectImage: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ editor, onSelectImage }) => {
  if (!editor) return null;

  const btnClass = (type: string, attrs?: any) => {
    const isActive = editor.isActive(type, attrs);
    return `p-1.5 px-3 rounded text-xs font-bold transition-colors ${
      isActive 
        ? 'bg-indigo-600 text-white shadow-inner' 
        : 'text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200'
    }`;
  };

  return (
    <div className="bg-white border-b p-2 flex justify-center items-center gap-1 shadow-sm sticky top-0 z-20">
      <button 
        onClick={() => editor.chain().focus().toggleBold().run()} 
        className={btnClass('bold')}
      >B</button>
      
      <button 
        onClick={() => editor.chain().focus().toggleItalic().run()} 
        className={btnClass('italic')}
      >I</button>
      
      <div className="w-px h-6 bg-gray-200 mx-2" />
      
      {[1, 2, 3].map(lvl => (
        <button 
          key={lvl} 
          onClick={() => editor.chain().focus().toggleHeading({ level: lvl as any }).run()} 
          className={btnClass('heading', { level: lvl })}
        >
          H{lvl}
        </button>
      ))}
      
      <div className="w-px h-6 bg-gray-200 mx-2" />
      
      <button 
        onClick={onSelectImage} 
        className="p-1.5 px-4 border rounded text-xs font-bold text-purple-600 hover:bg-purple-50 transition-all active:scale-95"
      >
        📷 IMAGE
      </button>
    </div>
  );
};
