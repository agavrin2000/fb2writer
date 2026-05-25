'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { LinkIcon, Anchor, Globe, Trash2 } from 'lucide-react';
import { TextSelection, NodeSelection } from 'prosemirror-state';

/**
 * Свойства компонента всплывающего меню для управления ссылками в редакторе.
 */
interface LinkBubbleMenuProps {
  /**
   * Экземпляр редактора Tiptap.
   * Если `null`, компонент не будет отрисовываться.
   */
  editor: Editor | null;
}

/**
 * Проверяет, является ли URL внешней ссылкой или специальным типом (mailto:, tel:, # и т.д.).
 *
 * @param trimmedUrl - Обработанный URL-адрес.
 * @returns `true`, если ссылка внешняя или специальная; иначе — `false`.
 */
const checkIsExternalOrSpecial = (trimmedUrl: string): boolean => {
  return (
    trimmedUrl.startsWith('http://') || 
    trimmedUrl.startsWith('https://') || 
    trimmedUrl.startsWith('/') || 
    trimmedUrl.startsWith('mailto:') || 
    trimmedUrl.startsWith('tel:')
  );
};

/**
 * Форматирует URL перед сохранением.
 * Автоматически добавляет префикс `#` для внутренних якорей, если он отсутствует.
 *
 * @param rawUrl - Исходный URL из поля ввода.
 * @returns Отформатированный URL, готовый к сохранению.
 */
const formatUrlBeforeSave = (rawUrl: string): string => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  if (checkIsExternalOrSpecial(trimmed) || trimmed.startsWith('#')) {
    return trimmed;
  }

  return `#${trimmed}`;
};

/**
 * Всплывающее меню для управления ссылками в текстовом редакторе.
 *
 * Предоставляет интерфейс для:
 * - Просмотра и редактирования текущей ссылки.
 * - Удаления ссылки.
 * - Применения изменений по нажатию Enter или потере фокуса.
 *
 * Меню появляется только при выделении текста с активной ссылкой, исключая специальные типы (`rel="footnote"`, `class="fb2-link"`).
 *
 * @param props - Свойства компонента {@link LinkBubbleMenuProps}.
 * @returns Компонент всплывающего меню или `null`, если редактор не передан.
 *
 * @example
 * ```tsx
 * <LinkBubbleMenu editor={editor} />
 * ```
 */
export const LinkBubbleMenu: React.FC<LinkBubbleMenuProps> = ({ editor }) => {
  const [url, setUrl] = useState('');
  const urlRef = useRef('');
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isInternalFocusChange = useRef(false);

  /**
   * Обновляет состояние URL на основе текущего выделения в редакторе.
   * Используется при инициализации и при каждом изменении выделения.
   */
  const updateUrlFromEditor = useCallback(() => {
    if (!editor) return;
    const currentUrl = editor.getAttributes('link').href || '';
    setUrl(currentUrl);
    urlRef.current = currentUrl;
  }, [editor]);

  // Подписываемся на обновления выделения
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

  /**
   * Сохраняет ссылку в редакторе с указанным URL.
   * Если URL пустой — удаляет ссылку.
   *
   * @param targetUrl - Целевой URL для установки.
   * @param canFocus - Определяет, нужно ли вызывать `.focus()` в цепочке команд.
   */
  const saveLink = useCallback((targetUrl: string, canFocus = true) => {
    if (!editor) return;
    
    if (editor.state.selection instanceof NodeSelection) {
      return;
    }

    const finalUrl = formatUrlBeforeSave(targetUrl);
    const chain = canFocus ? editor.chain().focus() : editor.chain();

    if (finalUrl) {
      // Применяем ссылку строго к текущему выделению без расширения диапазона
      chain.setLink({ href: finalUrl }).run();
      setUrl(finalUrl);
      urlRef.current = finalUrl;
    } else {
      chain.unsetLink().run();
    }
  }, [editor]);

  /**
   * Фокусирует поле ввода URL с выделением всего текста.
   * Выполняется с задержкой через `setTimeout` для корректной работы с фокусом.
   */
  const focusInput = useCallback(() => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }, 120);
  }, []);

  // Обработка фокуса и событий выделения
  useEffect(() => {
    if (!editor) return;

    const forceFocus = () => focusInput();

    window.addEventListener('fb2-force-link-focus', forceFocus);

    const handleTextSelection = () => {
      if (editor.isActive('link') && !isInternalFocusChange.current) {
        if (document.activeElement !== inputRef.current && !menuRef.current?.contains(document.activeElement)) {
          forceFocus();
        }
      }
      isInternalFocusChange.current = false;
    };

    editor.on('selectionUpdate', handleTextSelection);

    return () => {
      window.removeEventListener('fb2-force-link-focus', forceFocus);
      editor.off('selectionUpdate', handleTextSelection);
    };
  }, [editor, focusInput]);

  // Закрытие меню при клике вне его области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!editor) return;

      if (editor.state.selection instanceof NodeSelection) {
        return;
      }

      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        saveLink(urlRef.current, false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [editor, saveLink]);

  if (!editor) return null;

  const isDeleteDisabled = !url.trim();
  const trimmedUrl = url.trim();

  /**
   * Рендерит иконку в зависимости от типа ссылки:
   * - Пустая строка: значок ссылки.
   * - Внешняя ссылка: глобус.
   * - Якорь: якорь.
   *
   * @returns Иконку в виде React-элемента.
   */
  const renderLinkIcon = () => {
    if (!trimmedUrl) {
      return <LinkIcon size={14} className="absolute left-3 text-ui-text-muted opacity-60 transition-all duration-200" />;
    }
    if (checkIsExternalOrSpecial(trimmedUrl)) {
      return <Globe size={14} className="absolute left-3 text-ui-accent bg-ui-accent/10 rounded-sm p-0.5 scale-110 transition-all duration-200" />;
    }
    return <Anchor size={14} className="absolute left-3 text-ui-text bg-ui-text/5 rounded-sm p-0.5 scale-110 transition-all duration-200" />;
  };

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="linkBubbleMenu"
      shouldShow={({ editor }) => {
        if (!(editor.state.selection instanceof TextSelection)) {
          return false;
        }
        if (!editor.isActive('link')) return false;
        const attrs = editor.getAttributes('link');
        return attrs.rel !== 'footnote' && !attrs.class?.includes('fb2-link');
      }}
      updateDelay={0}
    >
      <div
        ref={menuRef}
        className="flex items-center p-1.5 gap-2 bg-ui-bg shadow-dropdown border border-ui-border rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center">
          {renderLinkIcon()}
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              urlRef.current = e.target.value;
            }}
            placeholder="Вставьте ссылку или ID якоря..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                isInternalFocusChange.current = true;
                saveLink(url, true);
                editor.commands.focus();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                editor.commands.focus();
              }
            }}
            className="pl-9 pr-2 py-1.5 w-64 border rounded-lg text-xs font-book bg-ui-bg border-ui-border text-ui-text outline-none transition-all focus:bg-paper-bg focus:ring-1 focus:ring-ui-accent/30"
          />
        </div>

        <div className="flex items-center border-l border-ui-border ml-1 pl-1">
          <button
            title="Удалить ссылку"
            type="button"
            disabled={isDeleteDisabled}
            onClick={() => {
              isInternalFocusChange.current = true;
              saveLink('', true);
              setUrl('');
              urlRef.current = '';
              editor.commands.focus();
            }}
            className="p-2 transition-all rounded-lg disabled:cursor-not-allowed disabled:opacity-30 text-ui-text-muted hover:text-red-500 hover:bg-red-500/10"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </BubbleMenu>
  );
};