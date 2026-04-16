'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState, useMemo, memo } from 'react';
import { Bold, Italic, Quote, Strikethrough, Superscript as SuperscriptIcon, Subscript as SubscriptIcon, Hash, X, Trash2 } from 'lucide-react';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { Fb2Title } from './extensions/fb2title';
import { Fb2Cite } from './extensions/fb2cite';
import React, { useCallback } from 'react';
import { useConfirm } from "../../hooks/ConfirmContext";
import { createPortal } from 'react-dom';
import { JSONContent } from "@tiptap/core";
import { EditorToolbarButton } from "@/components/ui/EditorToolbarButton"
/**
 * Интерфейс свойств компонента всплывающего окна редактирования сноски.
 */
interface NotePopupProps {
  /**
   * Объект с информацией о текущей сноске: её ID, координаты клика и флаг "новая ли".
   */
  note: { id: string; x: number; y: number; isNew?: boolean };

  /**
   * Текущее содержимое сноски (в формате TipTap JSON или массив узлов).
   */
  content: JSONContent;

  /**
   * Список существующих ID сносок, используется для проверки дубликатов.
   */
  existingIds: string[];

  /**
   * Функция обратного вызова, вызываемая при сохранении изменений.
   * @param json - Новое содержимое сноски в формате JSON.
   * @param newId - Новый ID сноски (если был изменён).
   */
  onUpdate: (json: JSONContent, newId?: string) => void;

  /**
   * Функция закрытия всплывающего окна без сохранения.
   */
  onClose: () => void;

  /**
   * Функция удаления сноски по её ID.
   * @param id - Идентификатор удаляемой сноски.
   */
  onDelete: (id: string) => void;
}


/**
 * Компонент всплывающего окна для создания и редактирования сносок в редакторе.
 * Позволяет:
 * - Изменять ID сноски с проверкой на уникальность.
 * - Редактировать содержимое с помощью встроенного редактора TipTap.
 * - Применять форматирование (жирный, курсив, цитаты и т.д.).
 * - Удалять сноску (только для существующих).
 * 
 * Окно позиционируется рядом с местом клика и автоматически корректирует положение,
 * чтобы не выходить за границы экрана. Использует портал для отрисовки вне основного DOM-дерева.
 * 
 * @component
 * @param props - Свойства компонента {@link NotePopupProps}.
 * 
 * @example
 * <NotePopup
 *   note={{ id: "note1", x: 100, y: 200 }}
 *   content={[{ type: "paragraph", content: [{ type: "text", text: "Текст сноски" }] }]}
 *   existingIds={["note1", "note2"]}
 *   onUpdate={(content, id) => console.log("Обновлено:", id, content)}
 *   onClose={() => console.log("Закрыто")}
 *   onDelete={(id) => console.log("Удалено:", id)}
 * />
 */
export const NotePopup = memo(({ note, content, existingIds, onUpdate, onClose, onDelete }:NotePopupProps) => {
  const confirm = useConfirm();
  const [editableId, setEditableId] = useState(note.id);
  const [isConfirming, setIsConfirming] = useState(false);
  const [, setUpdateTick] = useState(0);
  const forceUpdate = useCallback(() => setUpdateTick(tick => tick + 1), []);

  // Настройки размеров попапа для корректного позиционирования
  const POPUP_WIDTH = 384; // w-96 в Tailwind
  const POPUP_HEIGHT = 350; // Примерная средняя высота

  /**
 * Обработчик удаления сноски с подтверждением действия.
 */
  const handleDelete = async () => {
    setIsConfirming(true); // Блокируем onClose
    const confirmed = await confirm.ask(
      "Удаление сноски",
      "Удалить сноску? Отменить действие невозможно.",
      "danger",
    );
    if (confirmed) {
      onDelete(note.id);
    }
    setIsConfirming(false);
  };

  // Обновляем ID при смене активной сноски
  if (editableId !== note.id) {
    setEditableId(note.id);
  }

  useEffect(() => {
    const handleEvent = (e: Event) => {
      const target = e.target as Element;

      if (isConfirming || target?.closest('.note-popup-container')) return;
      onClose();
    };

    // Слушаем прокрутку на всем документе (включая захват событий)
    window.addEventListener('scroll', handleEvent, false);
    window.addEventListener('resize', handleEvent);

    return () => {
      window.removeEventListener('scroll', handleEvent, false);
      window.removeEventListener('resize', handleEvent);
    };
  }, [onClose, isConfirming]);

  /**
   * Вычисляет корректные координаты для попапа, чтобы он не выходил за границы экрана.
   * При недостатке места снизу — отображается над точкой клика.
   */
  const { adjustedPosition } = useMemo(() => {
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

  /**
   * Экземпляр редактора TipTap для внутреннего редактирования содержимого сноски.
   */
  const editor = useEditor({
    extensions: [StarterKit.configure({
      gapcursor: false,
    }), Superscript, Subscript, Fb2Title, Fb2Cite],
    content: content ?? { type: 'doc', content: [] },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'note-popup-editor prose prose-sm font-serif outline-none p-3 min-h-[120px] focus:outline-none',
      },
    },
    // Фокусируемся в конец текста при создании
    onCreate: ({ editor }) => {
      setTimeout(() => editor.commands.focus('end'), 100);
    },
    onUpdate: forceUpdate,
    onSelectionUpdate: forceUpdate, // Это заставит кнопки "оживать" при движении курсора
    onTransaction: forceUpdate,
  });

  // Синхронизация контента при переключении между сносками
  useEffect(() => {
    if (editor && !editor.isDestroyed && content) {
      const currentJson = JSON.stringify(editor.getJSON());
      const nextJson = JSON.stringify(content ?? { type: 'doc', content: [] });
      if (currentJson !== nextJson) {
        editor.commands.setContent(content ?? { type: 'doc', content: [] }, { emitUpdate: false });
      }
    }
  }, [note.id, editor, content]);

  // Закрытие по клавише Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Если нажата клавиша Escape и сейчас не открыто окно подтверждения (Confirm)
      if (e.key === 'Escape' && !isConfirming) {
        onClose();
      }
    };

    // Добавляем слушатель на всё окно
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      // Чистим за собой
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, isConfirming]);

  if (!editor) return null;

  /**
   * Обработчик сохранения изменений в сноске.
   */
  const handleSave = () => {
    if (hasError) return;
    onUpdate(editor.getJSON(), editableId.trim());
    onClose();
  };

  return createPortal(
    <>
      {/* 1. Фоновая подложка (Backdrop) */}
      <div
        className="fixed inset-0 z-[90] bg-slate-900/20 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* 2. Само окно (Popup) */}
      <div
        className="note-popup-container fixed z-[100] bg-white shadow-2xl border border-blue-100 rounded-2xl w-96 overflow-hidden flex flex-col" // Добавили flex flex-col
        style={{
          top: adjustedPosition.top,
          left: adjustedPosition.left,
          height: '250px' // ЗАДАЙТЕ ФИКСИРОВАННУЮ ВЫСОТУ
        }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* Шапка с полем ID и кнопками */}
        <div className={`flex flex-none justify-between items-center px-3 py-2 border-b transition-colors duration-200 ${isDuplicate ? 'bg-red-50 border-red-200' :
          isEmpty ? 'bg-amber-50 border-amber-200' :
            'bg-slate-50 border-slate-100'
          }`}>
          <div className="flex items-center gap-2 flex-1 mr-4 min-w-0">
            <Hash size={12} className={isDuplicate ? 'text-red-500' : isEmpty ? 'text-amber-500' : 'text-blue-500'} />
            <input
              type="text"
              spellCheck="false"
              onFocus={(e) => e.target.select()}
              value={editableId}
              onChange={(e) => setEditableId(e.target.value)}
              placeholder="Введите ID..."
              className={`bg-transparent border-none text-[11px] font-bold uppercase tracking-widest focus:ring-0 focus:outline-none w-full px-1 rounded transition-all ${isDuplicate ? 'text-red-600' : isEmpty ? 'text-amber-600' : 'text-slate-600 hover:bg-slate-200/50'
                }`}
            />
          </div>

          <div className="flex flex-none items-center gap-2">
            {isDuplicate && <span className="text-[8px] text-red-500 font-black animate-pulse whitespace-nowrap">ID ЗАНЯТ</span>}
            {isEmpty && <span className="text-[8px] text-amber-600 font-black whitespace-nowrap">ПУСТО</span>}
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
        <div className="flex flex-none items-center gap-1 px-2 py-1 bg-white border-b border-slate-100">
          <EditorToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            disabled={!editor.can().chain().toggleBold()} // ПРОВЕРКА
            icon={<Bold size={14} />}
          />
          <EditorToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            disabled={!editor.can().chain().toggleItalic()} // ПРОВЕРКА
            icon={<Italic size={14} />}
          />
          <EditorToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            disabled={!editor.can().chain().toggleStrike()}
            icon={<Strikethrough size={14} />}
          />
          <EditorToolbarButton
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            active={editor.isActive('superscript')}
            disabled={!editor.can().chain().toggleSuperscript()}
            icon={<SuperscriptIcon size={14} />}
          />
          <EditorToolbarButton
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            active={editor.isActive('subscript')}
            disabled={!editor.can().chain().toggleSubscript()}
            icon={<SubscriptIcon size={14} />}
          />
          <EditorToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("fb2Cite")}
            disabled={!editor.can().chain().toggleBlockquote()}
            icon={<Quote size={14} />}
          />
        </div>

        {/* Центрируем редактор и ограничиваем его ширину */}
        <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
          <EditorContent editor={editor} />
        </div>

        {/* Подвал */}
        <div className="flex-none px-4 py-2 bg-slate-50 flex justify-end gap-2 border-t border-slate-100">
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
    </>,
    document.body);
});

NotePopup.displayName = "NotePopup";