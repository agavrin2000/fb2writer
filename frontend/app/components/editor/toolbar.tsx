import { Editor } from '@tiptap/react';
import React from 'react';
import { Bold, Italic, Strikethrough, Code, Quote, Superscript, Subscript, FileImage, Baseline, Asterisk, Feather, AlignLeft, Heading1, TextQuote, Signature, FileText } from 'lucide-react';
import { useEditorState } from '@tiptap/react'
import { Fb2ActionIcon } from '../ui/Fb2ActionIcon'
import { ImageDropdown } from './ImageDropdown'
import '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fb2: {
      insertFb2Title: () => ReturnType,
      removeFb2Title: () => ReturnType,
      insertFb2Epigraph: () => ReturnType,
      removeFb2Epigraph: () => ReturnType,
      insertFb2TextAuthor: () => ReturnType,
      removeFb2TextAuthor: () => ReturnType,
      insertFb2Subtitle: () => ReturnType,
      removeFb2Subtitle: () => ReturnType,
      insertFb2Poem: () => ReturnType,
      removeFb2Poem: () => ReturnType,
      insertFb2Stanza: () => ReturnType,
      removeFb2Stanza: () => ReturnType,
      insertFb2Annotation: () => ReturnType,
      removeFb2Annotation: () => ReturnType,
    }
  }
}

// Выносим интерфейс стейта для чистоты
interface EditorCapabilities {
  canInsertTitle: boolean; canRemoveTitle: boolean;
  canInsertEpigraph: boolean; canRemoveEpigraph: boolean;
  canInsertTextAuthor: boolean; canRemoveTextAuthor: boolean;
  canInsertSubtitle: boolean; canRemoveSubtitle: boolean;
  canInsertPoem: boolean; canRemovePoem: boolean;
  canInsertStanza: boolean; canRemoveStanza: boolean;
  canInsertAnnotation: boolean; canRemoveAnnotation: boolean;
}

interface ToolbarProps {
  editor: Editor | null;
  onSelectImage: (type: 'block' | 'inline' | 'section') => void;
  onAddFootnote: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ editor, onSelectImage, onAddFootnote }) => {
  const editorCapabilities = useEditorState({
    editor: editor!, // Используем non-null assertion, так как ниже есть проверка if(!editor)
    selector: (ctx): EditorCapabilities => {
      const { editor: ed } = ctx;
      if (!ed) return {
        canInsertTitle: false, canRemoveTitle: false,
        canInsertEpigraph: false, canRemoveEpigraph: false,
        canInsertTextAuthor: false, canRemoveTextAuthor: false,
        canInsertSubtitle: false, canRemoveSubtitle: false,
        canInsertPoem: false, canRemovePoem: false,
        canInsertStanza: false, canRemoveStanza: false,
        canInsertAnnotation: false, canRemoveAnnotation: false,
      };

      return {
        canInsertTitle: ed.can().insertFb2Title(),
        canRemoveTitle: ed.can().removeFb2Title(),
        canInsertEpigraph: ed.can().insertFb2Epigraph(),
        canRemoveEpigraph: ed.can().removeFb2Epigraph(),
        canInsertTextAuthor: ed.can().insertFb2TextAuthor(),
        canRemoveTextAuthor: ed.can().removeFb2TextAuthor(),
        canInsertSubtitle: ed.can().insertFb2Subtitle(),
        canRemoveSubtitle: ed.can().removeFb2Subtitle(),
        canInsertPoem: ed.can().insertFb2Poem(),
        canRemovePoem: ed.can().removeFb2Poem(),
        canInsertStanza: ed.can().insertFb2Stanza(),
        canRemoveStanza: ed.can().removeFb2Stanza(),
        canInsertAnnotation: ed.can().insertFb2Annotation(),
        canRemoveAnnotation: ed.can().removeFb2Annotation(),
      };
    },
  });
  const handleImageSelect = (type: 'block' | 'inline' | 'section') => {
    // Здесь вызываем ваш диалог выбора файла, передавая тип
    onSelectImage(type);
  };

  if (!editor) return null;

  const {
    canInsertTitle, canRemoveTitle, canInsertEpigraph, canRemoveEpigraph,
    canInsertTextAuthor, canRemoveTextAuthor, canInsertSubtitle, canRemoveSubtitle,
    canInsertPoem, canRemovePoem, canInsertStanza, canRemoveStanza,
    canInsertAnnotation, canRemoveAnnotation,
  } = editorCapabilities;

  const btnClass = (type: string, attrs?: Record<string, any>) => {
    const isActive = editor.isActive(type, attrs);
    return `p-1.5 px-3 rounded text-xs font-bold transition-colors ${isActive
      ? 'bg-indigo-600 text-white shadow-inner'
      : 'text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200'
      }`;
  };


  const btnCustomClass = "p-1.5 px-3 rounded text-xs font-bold transition-all flex items-center justify-center border border-transparent bg-white text-gray-600 shadow-sm " + 
                 "hover:bg-gray-100 hover:border-gray-200 active:bg-gray-200 " +
                 "disabled:opacity-40 disabled:bg-gray-50 disabled:text-gray-300 disabled:border-gray-100 disabled:cursor-not-allowed disabled:shadow-none disabled:pointer-events-none";
  const isInsideParagraph = editor.isActive('paragraph');

  return (
    <div className="bg-white border-b p-2 flex justify-center items-center gap-1 shadow-sm sticky top-0 z-20">
      {/* Стандартные кнопки оформления текста */}
      <button type='button' title='Bold' onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass('bold')}><Bold size={20} /></button>
      <button type='button' title='Italic' onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass('italic')}><Italic size={20} /></button>
      <button type='button' title='Strike' onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass('strike')}><Strikethrough size={20} /></button>
      <button type='button' title='Superscript' onClick={() => editor.chain().focus().toggleSuperscript().run()} className={btnClass('superscript')}><Superscript size={20} /></button>
      <button type='button' title='Subscript' onClick={() => editor.chain().focus().toggleSubscript().run()} className={btnClass('subscript')}><Subscript size={20} /></button>
      <button type='button' title='Blockquote' onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnClass('blockquote')}><Quote size={20} /></button>
      <button type='button' title='Code' onClick={() => editor.chain().focus().toggleCode().run()} className={btnClass('code')}><Code size={20} /></button>

      <div className="w-px h-6 bg-gray-200 mx-2" />
      {/* Заголовок */}
      <button
        type='button'
        onClick={() => canRemoveTitle ? editor.chain().focus().removeFb2Title().run() : editor.chain().focus().insertFb2Title().run()}
        disabled={!canRemoveTitle && !canInsertTitle}
        className={btnCustomClass}
        title={canRemoveTitle ? "Удалить заголовок" : "Добавить заголовок"}
      >
        <Fb2ActionIcon icon={Heading1} mode={canRemoveTitle ? "remove" : "add"} />
      </button>

      {/* Добавить Эпиграф */}
      <button
        type='button'
        onClick={() => editor.chain().focus().insertFb2Epigraph().run()}
        disabled={!canInsertEpigraph}
        className={btnCustomClass}
        title="Добавить эпиграф"
      >
        <Fb2ActionIcon icon={TextQuote} mode="add" />
      </button>

      {/* Удалить Эпиграф */}
      <button
        type='button'
        onClick={() => editor.chain().focus().removeFb2Epigraph().run()}
        disabled={!canRemoveEpigraph}
        className={btnCustomClass}
        title="Удалить эпиграф"
      >
        <Fb2ActionIcon icon={TextQuote} mode="remove" />
      </button>

      {/* Аннотация */}
      <button
        type='button'
        onClick={() => canRemoveAnnotation ? editor.chain().focus().removeFb2Annotation().run() : editor.chain().focus().insertFb2Annotation().run()}
        disabled={!canRemoveAnnotation && !canInsertAnnotation}
        className={btnCustomClass}
        title={canRemoveAnnotation ? "Удалить аннотацию" : "Добавить аннотацию"}
      >
        <Fb2ActionIcon icon={FileText} mode={canRemoveAnnotation ? "remove" : "add"} />
      </button>

      {/* Добавить подпись автора */}
      <button
        type='button'
        onClick={() => editor.chain().focus().insertFb2TextAuthor().run()}
        disabled={!canInsertTextAuthor}
        className={btnCustomClass}
        title="Добавить подпись автора"
      >
        <Fb2ActionIcon icon={Signature} mode="add" />
      </button>

      {/* Удалить подпись автора */}
      <button
        type='button'
        onClick={() => editor.chain().focus().removeFb2TextAuthor().run()}
        disabled={!canRemoveTextAuthor}
        className={btnCustomClass}
        title="Удалить подпись автора"
      >
        <Fb2ActionIcon icon={Signature} mode="remove" />
      </button>

      {/* Подзаголовок */}
      <button
        type='button'
        onClick={() => canRemoveSubtitle ? editor.chain().focus().removeFb2Subtitle().run() : editor.chain().focus().insertFb2Subtitle().run()}
        disabled={!canRemoveSubtitle && !canInsertSubtitle}
        className={btnCustomClass}
        title={canRemoveSubtitle ? "Удалить подзаголовок" : "Добавить подзаголовок"}
      >
        <Fb2ActionIcon icon={Baseline} mode={canRemoveSubtitle ? "remove" : "add"} />
      </button>

      {/* Поэма */}
      <button
        type='button'
        onClick={() => canRemovePoem ? editor.chain().focus().removeFb2Poem().run() : editor.chain().focus().insertFb2Poem().run()}
        disabled={!canRemovePoem && !canInsertPoem}
        className={btnCustomClass}
        title={canRemovePoem ? "Удалить поэму" : "Добавить поэму"}
      >
        <Fb2ActionIcon icon={Feather} mode={canRemovePoem ? "remove" : "add"} />
      </button>

      {/* Строфа */}
      <button
        type='button'
        onClick={() => canRemoveStanza ? editor.chain().focus().removeFb2Stanza().run() : editor.chain().focus().insertFb2Stanza().run()}
        disabled={!canRemoveStanza && !canInsertStanza}
        className={btnCustomClass}
        title={canRemoveStanza ? "Удалить строфу" : "Добавить строфу"}
      >
        <Fb2ActionIcon icon={AlignLeft} mode={canRemoveStanza ? "remove" : "add"} />
      </button>

      {/* Сноска */}
      <button
        type='button'
        title='Вставить сноску'
        onClick={onAddFootnote}
        disabled={!isInsideParagraph}
        className={btnCustomClass}
      >
        <Fb2ActionIcon icon={Asterisk} mode="add" />
      </button>

      <ImageDropdown onSelect={handleImageSelect} />
      {/*
      <button type='button' title='Вставить изображение'
        onClick={onSelectImage}
        className={btnClass('image')}
      ><FileImage size={20} />
      </button>
      */}
    </div>
  );
};
