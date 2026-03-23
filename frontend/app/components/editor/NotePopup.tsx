'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState, useMemo, FC } from 'react';
import { Bold, Italic, Quote, Strikethrough, Superscript as SuperscriptIcon, Subscript as SubscriptIcon, Hash, X, RotateCcw, Trash2 } from 'lucide-react';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { Fb2Title } from './extensions/fb2title';
import React from 'react';

interface NotePopupProps {
  note: { id: string; x: number; y: number; isNew?: boolean; };
  content: any;
  existingIds: string[];
  onUpdate: (json: any, newId?: string) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export const NotePopup: React.FC<NotePopupProps> = ({ note, content, existingIds, onUpdate, onClose, onDelete }) => {

  const [editableId, setEditableId] = useState(note.id);
  const handleDelete = () => {
    if (window.confirm(`Вы уверены, что хотите полностью удалить сноску ${note.id}?`)) {
      onDelete(note.id);
    }
  };
  useEffect(() => {
    setEditableId(note.id);
  }, [note.id]);


  useEffect(() => {
    const handleEvent = () => {
      // Закрываем окно при любом движении страницы или изменении размера
      onClose();
    };

    // Слушаем прокрутку на всем документе (включая захват событий)
    window.addEventListener('scroll', handleEvent, true);
    window.addEventListener('resize', handleEvent);

    return () => {
      window.removeEventListener('scroll', handleEvent, true);
      window.removeEventListener('resize', handleEvent);
    };
  }, [onClose]);

  // Константы размеров для расчета позиционирования
  const POPUP_WIDTH = 384; // w-96 в Tailwind
  const POPUP_HEIGHT = 350; // Примерная средняя высота

  const { adjustedPosition, isFullUp } = useMemo(() => {
    if (typeof window === 'undefined') return { adjustedPosition: { top: note.y + 15, left: note.x }, isFullUp: false };

    let left = note.x;
    let top = note.y + 15;
    let isFullUp = false;

    if (left + POPUP_WIDTH > window.innerWidth) {
      left = window.innerWidth - POPUP_WIDTH - 20;
    }
    if (left < 10) left = 10;

    // Если снизу места меньше, чем высота попапа — прыгаем вверх
    if (top + POPUP_HEIGHT > window.innerHeight) {
      top = note.y - POPUP_HEIGHT - 15;
      isFullUp = true;
    }
    if (top < 10) top = 10;

    return { adjustedPosition: { top, left }, isFullUp };
  }, [note.x, note.y]);

  const isEmpty = editableId.trim() === "";
  const isDuplicate = useMemo(() => {
    const trimmedId = editableId.trim();
    return !isEmpty && trimmedId !== note.id && existingIds.includes(trimmedId);
  }, [editableId, note.id, existingIds, isEmpty]);

  const hasError = isEmpty || isDuplicate;

  const safeContent = useMemo(() => {
    if (!content) return { type: 'doc', content: [] };
    if (Array.isArray(content)) return { type: 'doc', content: content };
    return content;
  }, [content]);

  const editor = useEditor({
    extensions: [StarterKit, Superscript, Subscript, Fb2Title],
    content: safeContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'note-popup-editor prose prose-sm font-serif outline-none min-h-[120px] max-h-[300px] overflow-y-auto p-2 border rounded focus:ring-2 focus:ring-blue-400 transition-all',
      },
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed && safeContent) {
      editor.commands.setContent(safeContent, { emitUpdate: false });
    }
  }, [note.id, editor, safeContent]);

  if (!editor) return null;

  const handleSave = () => {
    if (hasError) return;
    onUpdate(editor.getJSON().content, editableId.trim());
    onClose();
  };

  return (
    <>
      {/* 1. Фоновая подложка (Backdrop) */}
      <div
        className="fixed inset-0 z-90 bg-slate-900/20 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* 2. Само окно (Popup) */}
      <div
        className="fixed z-100 bg-white shadow-2xl border border-blue-100 rounded-2xl w-100 overflow-hidden"
        style={{
          top: adjustedPosition.top,
          left: adjustedPosition.left
        }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* Шапка */}
        <div className={`flex justify-between items-center px-3 py-2 border-b transition-colors duration-200 ${isDuplicate ? 'bg-red-50 border-red-200' :
          isEmpty ? 'bg-amber-50 border-amber-200' :
            'bg-slate-50 border-slate-100'
          }`}>
          <div className="flex items-center gap-2 flex-1 mr-4 min-w-0">
            <Hash size={12} className={isDuplicate ? 'text-red-500' : isEmpty ? 'text-amber-500' : 'text-blue-500'} />
            <input
              type="text"
              value={editableId}
              onChange={(e) => setEditableId(e.target.value)}
              placeholder="Введите ID..."
              className={`bg-transparent border-none text-[11px] font-bold uppercase tracking-widest focus:ring-0 focus:outline-none w-full px-1 rounded transition-all ${isDuplicate ? 'text-red-600' : isEmpty ? 'text-amber-600' : 'text-slate-600 hover:bg-slate-200/50'
                }`}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isDuplicate && <span className="text-[8px] text-red-500 font-black animate-pulse whitespace-nowrap">ID ЗАНЯТ</span>}
            {isEmpty && <span className="text-[8px] text-amber-600 font-black whitespace-nowrap">ПУСТО</span>}
            {/* КНОПКА УДАЛЕНИЯ */}
            {!note.isNew && (
              <button type="button"
                onClick={handleDelete}
                className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors"
                title="Удалить сноску и все ссылки на нее"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button type="button" title="Закрыть" onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Тулбар */}
        <div className="flex items-center gap-1 px-2 py-1 bg-white border-b border-slate-100">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} icon={<Bold size={14} />} />
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} icon={<Italic size={14} />} />
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} icon={<Strikethrough size={14} />} />
          <ToolbarButton onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} icon={<SuperscriptIcon size={14} />} />
          <ToolbarButton onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')} icon={<SubscriptIcon size={14} />} />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} icon={<Quote size={14} />} title="Цитата" />
        </div>

        <EditorContent editor={editor} />

        {/* Подвал */}
        <div className="px-4 py-2 bg-slate-50 flex justify-end gap-2 border-t border-slate-100">
          <button type="button" title="Отмена" onClick={onClose} className="text-[11px] text-slate-500 px-3 hover:text-slate-700">Отмена</button>
          <button type="button" title="Готово"
            onClick={handleSave}
            disabled={hasError}
            className={`text-[11px] font-bold px-5 py-1.5 rounded-lg transition-all shadow-sm ${hasError ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
              }`}
          >
            Готово
          </button>
        </div>
      </div>
    </>
  );
};

const ToolbarButton = ({ onClick, active, icon }: any) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-1.5 rounded transition-colors ${active ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
  >
    {icon}
  </button>
);
