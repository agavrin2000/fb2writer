import { Editor } from '@tiptap/react';
import React from 'react';
import { Bold, Italic, Strikethrough, Code, Quote, Superscript, Subscript, FileImage } from 'lucide-react';

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
      <button type='button' title='Bold' 
        onClick={() => editor.chain().focus().toggleBold().run()} 
        className={btnClass('bold')}
      ><Bold size={20} /></button>
      
      <button type='button' title='Italic' 
        onClick={() => editor.chain().focus().toggleItalic().run()} 
        className={btnClass('italic')}
      ><Italic size={20} /></button>
      
      <button type='button' title='Strike'
        onClick={() => editor.chain().focus().toggleStrike().run()} 
        className={btnClass('strike')}
      ><Strikethrough size={20} /></button>

      <button type='button'  title='Superscript'
        onClick={() => editor.chain().focus().toggleSuperscript().run()} 
        className={btnClass('superscript')}
      ><Superscript size={20} /></button>

      <button type='button' title='Subscript' 
        onClick={() => editor.chain().focus().toggleSubscript().run()} 
        className={btnClass('subscript')}
      ><Subscript size={20} /></button>

      <button type='button' title='Blockquote' 
        onClick={() => editor.chain().focus().toggleBlockquote().run()} 
        className={btnClass('blockquote')}
      ><Quote size={20} /></button>

      <button type='button' title='Code' 
        onClick={() => editor.chain().focus().toggleCode().run()} 
        className={btnClass('code')}
      ><Code size={20} /></button>

      <div className="w-px h-6 bg-gray-200 mx-2" />
    
      <button onClick={() => (editor as any).chain().focus().insertSection().run()}>Добавить главу</button>
      <button onClick={() => (editor as any).chain().focus().deleteSection().run()}>Удалить главу</button>

      <button type='button' title='Image'  
        onClick={onSelectImage} 
        className={btnClass('image')}
      ><FileImage size={20} />
      </button>
    </div>
  );
};
