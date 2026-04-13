'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Link as LinkIcon, Trash2 } from 'lucide-react';

interface LinkBubbleMenuProps {
  editor: Editor | null;
}

export const LinkBubbleMenu: React.FC<LinkBubbleMenuProps> = ({ editor }) => {
  const [url, setUrl] = useState('');
  const urlRef = useRef('');
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Синхронизация текста в инпуте с текущей ссылкой в редакторе
  const updateUrlFromEditor = useCallback(() => {
    if (!editor) return;
    const currentUrl = editor.getAttributes('link').href || '';
    setUrl(currentUrl);
    urlRef.current = currentUrl;
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    editor.on('selectionUpdate', updateUrlFromEditor);
    queueMicrotask(() => {
      updateUrlFromEditor();
    });
    return () => {
      editor.off('selectionUpdate', updateUrlFromEditor);
    };
  }, [editor, updateUrlFromEditor]);

  // Функция сохранения (автоматически расширяет диапазон на всю ссылку)
  const saveLink = useCallback((targetUrl: string) => {
    if (!editor) return;
    const trimmed = targetUrl.trim();
    const oldUrl = editor.getAttributes('link').href || '';

    if (trimmed === oldUrl) return;

    if (trimmed) {
      editor.chain().extendMarkRange('link').setLink({ href: trimmed }).run();
    } else {
      editor.chain().extendMarkRange('link').unsetLink().run();
    }
  }, [editor]);

  const isLinkActive = editor?.isActive('link');
  // СЛУШАТЕЛЬ ДЛЯ ФОКУСА (вызывается из Toolbar через CustomEvent)
  useEffect(() => {
    const forceFocus = () => {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const len = inputRef.current.value.length;
          inputRef.current.setSelectionRange(len, len);
        }
      }, 120);
    };

    // 1. Слушаем принудительный сигнал из Toolbar
    window.addEventListener('fb2-force-link-focus', forceFocus);

    // 2. Если пользователь просто кликнул на существующую ссылку
    // (проверяем, что ссылка стала активной, а фокус еще в редакторе)
    if (editor?.isActive('link') && document.activeElement !== inputRef.current) {
      forceFocus();
    }

    return () => {
      window.removeEventListener('fb2-force-link-focus', forceFocus);
    };
    // Добавляем isActive в зависимости, чтобы реагировать на клики
  }, [isLinkActive, editor]);

  // Автосохранение при клике вне меню
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        saveLink(urlRef.current);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [saveLink]);

  // Защита от SSR (Next.js) и инициализации
  if (!editor) return null;

  // Уникальный ключ по позиции, чтобы React корректно обновлял инпуты при переходе
  const { from, to } = editor.state.selection;

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="linkBubbleMenu"
      shouldShow={({ editor }) => {
        if (!editor.isActive('link')) return false;
        const attrs = editor.getAttributes('link');
        // Скрываем для сносок FB2 (по rel или классу)
        return attrs.rel !== 'footnote' && !attrs.class?.includes('fb2-footnote');
      }}
      updateDelay={0}
    >
      <div
        key={`${from}-${to}`}
        ref={menuRef}
        className="flex items-center p-1.5 gap-2 bg-white shadow-2xl border border-slate-200 rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center">
          <LinkIcon size={12} className="absolute left-3 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              urlRef.current = e.target.value;
            }}
            placeholder="#"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveLink(url);
                editor.commands.focus();
              }
              if (e.key === 'Escape') {
                editor.commands.focus();
              }
            }}
            className="pl-8 pr-2 py-1.5 w-64 bg-slate-50 border border-slate-100 rounded-lg text-xs font-serif outline-none focus:bg-white focus:ring-2 focus:ring-blue-400 transition-all"
          />
        </div>

        <div className="flex items-center border-l border-slate-100 ml-1 pl-1">
          <button
            title="Удалить ссылку"
            type="button"
            disabled={!url || url === '#'}
            onClick={() => {
              editor.chain().focus().extendMarkRange('link').unsetLink().run();
            }}
            className={`p-2 transition-all rounded-lg ${(!url || url === '#')
                ? 'text-slate-200 cursor-not-allowed'
                : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
              }`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </BubbleMenu>
  );
};
