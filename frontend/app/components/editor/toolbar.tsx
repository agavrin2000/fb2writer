import { Editor } from '@tiptap/react';
import React from 'react';
import { BookPlus, Bold, Italic, Strikethrough, Code, Quote, Superscript, Subscript, FileImage, Baseline, Asterisk, Feather, AlignLeft } from 'lucide-react';
import { ALargeSmall, Heading1, TextQuote, Signature, PenTool } from 'lucide-react'
import { useEditorState } from '@tiptap/react'
import { Fb2ActionIcon } from '../ui/fb2action-icon'

interface ToolbarProps {
  editor: Editor | null;
  onSelectImage: () => void;
  onAddFootnote: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ editor, onSelectImage, onAddFootnote }) => {

  const editorState = useEditorState({
    editor: editor as Editor, // Принудительное приведение типа для TS
    selector: (ctx) => {
      // Проверяем наличие редактора внутри селектора
      if (!ctx.editor) {
        return {
          canInsertTitle: false,
          canRemoveTitle: false,
          canInsertEpigraph: false,
          canRemoveEpigraph: false,
          canInsertTextAuthor: false,
          canRemoveTextAuthor: false,
          canInsertSubtitle: false,
          canRemoveSubtitle: false,
          canInsertPoem: false,
          canRemovePoem: false,
          canInsertStanza: false,
          canRemoveStanza: false,
        }
      };
      return {
        canInsertTitle: (ctx.editor as any).can().insertFb2Title(),
        canRemoveTitle: (ctx.editor as any).can().removeFb2Title(),
        canInsertEpigraph: (ctx.editor as any).can().insertFb2Epigraph(),
        canRemoveEpigraph: (ctx.editor as any).can().removeFb2Epigraph(),
        canInsertTextAuthor: (ctx.editor as any).can().insertFb2TextAuthor(),
        canRemoveTextAuthor: (ctx.editor as any).can().removeFb2TextAuthor(),
        canInsertSubtitle: (ctx.editor as any).can().insertFb2Subtitle(),
        canRemoveSubtitle: (ctx.editor as any).can().removeFb2Subtitle(),
        canInsertPoem: (ctx.editor as any).can().insertFb2Poem(),
        canRemovePoem: (ctx.editor as any).can().removeFb2Poem(),
        canInsertStanza: (ctx.editor as any).can().insertFb2Stanza(),
        canRemoveStanza: (ctx.editor as any).can().removeFb2Stanza(),
      };
    },
  });

  if (!editor) return null;
  const { canInsertTitle, canRemoveTitle, canInsertEpigraph, canRemoveEpigraph,
    canInsertTextAuthor, canRemoveTextAuthor, canInsertSubtitle, canRemoveSubtitle,
    canInsertPoem, canRemovePoem, canInsertStanza, canRemoveStanza
  } = editorState as {
    canInsertTitle: boolean;
    canRemoveTitle: boolean;
    canInsertEpigraph: boolean;
    canRemoveEpigraph: boolean;
    canInsertTextAuthor: boolean;
    canRemoveTextAuthor: boolean;
    canInsertSubtitle: boolean;
    canRemoveSubtitle: boolean;
    canInsertPoem: boolean;
    canRemovePoem: boolean;
    canInsertStanza: boolean;
    canRemoveStanza: boolean;
  };

  const btnClass = (type: string, attrs?: any) => {
    const isActive = editor.isActive(type, attrs);
    return `p-1.5 px-3 rounded text-xs font-bold transition-colors ${isActive
      ? 'bg-indigo-600 text-white shadow-inner'
      : 'text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200'
      }`;
  };
  const isInsideParagraph = editor.isActive('paragraph');

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

      {canRemoveTitle ?
        <button type='button'
          onClick={() => (editor as any).chain().focus().removeFb2Title().run()}
          className="p-2 text-red-500 hover:bg-red-50 rounded"
          title="Удалить заголовок"
        >
          <Fb2ActionIcon icon={Heading1} mode="remove" />
        </button>
        :
        <button type='button'
          onClick={() => (editor as any).chain().focus().insertFb2Title().run()}
          disabled={!canInsertTitle}
          className={`p-2 rounded ${canInsertTitle ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-300'}`}
          title={!canInsertTitle ? "Заголовок уже есть в этой секции" : "Добавить заголовок"}
        >
          <Fb2ActionIcon icon={Heading1} mode="add" />
        </button>
      }

      {canRemoveEpigraph ?
        <button type='button'
          onClick={() => (editor as any).chain().focus().removeFb2Epigraph().run()}
          className={btnClass('fb2Epigraph')}
          //className="p-2 text-red-500 hover:bg-red-50 rounded"
          title="Удалить эпиграф"
        >
          <Fb2ActionIcon icon={TextQuote} mode="remove" />
        </button>
        :
        <button type='button'
          onClick={() => (editor as any).chain().focus().insertFb2Epigraph().run()}
          disabled={!canInsertEpigraph}
          className={btnClass('fb2Epigraph')}
          title="Добавить эпиграф"
        >
          <Fb2ActionIcon icon={TextQuote} mode="add" />
        </button>
      }

      {canRemoveTextAuthor ?
        <button type='button'
          onClick={() => (editor as any).chain().focus().removeFb2TextAuthor().run()}
          className={btnClass('fb2TextAuthor')}
          //className="p-2 text-red-500 hover:bg-red-50 rounded"
          title="Удалить подпись автора"
        >
          <Fb2ActionIcon icon={Signature} mode="remove" />
        </button>
        :
        <button type='button'
          onClick={() => (editor as any).chain().focus().insertFb2TextAuthor().run()}
          disabled={!canInsertTextAuthor}
          className={btnClass('fb2TextAuthor')}
          title="Добавить подпись автора"
        >
          <Fb2ActionIcon icon={Signature} mode="add" />
        </button>
      }

      {canRemoveSubtitle ?
        <button type='button'
          onClick={() => (editor as any).chain().focus().removeFb2Subtitle().run()}
          className={btnClass('fb2Subtitle')}
          title="Удалить подзаголовок"
        >
          <Fb2ActionIcon icon={Baseline} mode="remove" />
        </button>
        :
        <button type='button'
          onClick={() => (editor as any).chain().focus().insertFb2Subtitle().run()}
          disabled={!canInsertSubtitle}
          className={btnClass('fb2Subtitle')}
          title="Добавить подзаголовок"
        >
          <Fb2ActionIcon icon={Baseline} mode="add" />
        </button>
      }

      {canRemovePoem ?
        <button type='button'
          onClick={() => (editor as any).chain().focus().removeFb2Poem().run()}
          className={btnClass('fb2Poem')}
          title="Удалить поэму"
        >
          <Fb2ActionIcon icon={Feather} mode="remove" />
        </button>
        :
        <button type='button'
          onClick={() => (editor as any).chain().focus().insertFb2Poem().run()}
          disabled={!canInsertPoem}
          className={btnClass('fb2Poem')}
          title="Добавить поэму"
        >
          <Fb2ActionIcon icon={Feather} mode="add" />
        </button>
      }

      {canRemoveStanza ?
        <button type='button'
          onClick={() => (editor as any).chain().focus().removeFb2Stanza().run()}
          className={btnClass('fb2Stanza')}
          title="Удалить строфу"
        >
          <Fb2ActionIcon icon={AlignLeft} mode="remove" />
        </button>
        :
        <button type='button'
          onClick={() => (editor as any).chain().focus().insertFb2Stanza().run()}
          disabled={!canInsertStanza}
          className={btnClass('fb2Stanza')}
          title="Добавить строфу"
        >
          <Fb2ActionIcon icon={AlignLeft} mode="add" />
        </button>
      }

      <button type='button' title='Вставить сноску'
        onClick={onAddFootnote}
        disabled={!isInsideParagraph} // Блокируем кнопку
        className={`${btnClass('footnote')} ${isInsideParagraph
          ? 'text-blue-600 hover:bg-blue-50 border-blue-100 opacity-100'
          : 'text-gray-300 bg-gray-50 border-gray-100 cursor-not-allowed opacity-50'
          } border shadow-sm`}
      >
        <Asterisk size={20} />
      </button>

      <button type='button' title='Вставить изображение'
        onClick={onSelectImage}
        className={btnClass('image')}
      ><FileImage size={20} />
      </button>
    </div>
  );
};
