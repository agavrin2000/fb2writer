import { Editor } from '@tiptap/react';
import React from 'react';
import { BookPlus, BookX, Bold, Italic, Strikethrough, Code, Quote, Superscript, Subscript, FileImage } from 'lucide-react';
import { useEditorState } from '@tiptap/react'
import { TitleIcon } from '../ui/title-icon'

interface ToolbarProps {
  editor: Editor | null;
  onSelectImage: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ editor, onSelectImage }) => {
  if (!editor) return null;

  const btnClass = (type: string, attrs?: any) => {
    const isActive = editor.isActive(type, attrs);
    return `p-1.5 px-3 rounded text-xs font-bold transition-colors ${isActive
        ? 'bg-indigo-600 text-white shadow-inner'
        : 'text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200'
      }`;
  };

  const { canInsertTitle } = useEditorState({
    editor,
    selector: (ctx) => ({
      canInsertTitle: (ctx.editor as any).can().insertFb2Title(),
    }),
  })

  const { canRemoveTitle } = useEditorState({
    editor,
    selector: (ctx) => ({
      canRemoveTitle: (ctx.editor as any).can().removeFb2Title(),
    }),
  })

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

      <button type='button' title='Superscript'
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

      <button title='Добавить раздел' onClick={() => (editor as any).chain().focus().insertSection().run()}><BookPlus size={20} /></button>
      <button title='Удалить раздел' onClick={() => (editor as any).chain().focus().deleteSection().run()}><BookX size={20} /></button>

      {canRemoveTitle ?
        <button
          onClick={() => (editor as any).chain().focus().removeFb2Title().run()}
          className="p-2 text-red-500 hover:bg-red-50 rounded"
          title="Удалить заголовок"
        >
          <TitleIcon mode="remove" />
        </button>
        :
        <button
          onClick={() => (editor as any).chain().focus().insertFb2Title().run()}
          disabled={!canInsertTitle}
          className={`p-2 rounded ${canInsertTitle ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-300'}`}
          title={!canInsertTitle ? "Заголовок уже есть в этой секции" : "Добавить заголовок"}
        >
          <TitleIcon mode="add" />
        </button>
      }


      <button type='button' title='Вставить изображение'
        onClick={onSelectImage}
        className={btnClass('image')}
      ><FileImage size={20} />
      </button>
    </div>
  );
};
