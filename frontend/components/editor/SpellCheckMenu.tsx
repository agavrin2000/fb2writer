import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';

interface SpellcheckMenuProps {
  editor: Editor | null;
}

export const SpellcheckMenu: React.FC<SpellcheckMenuProps> = ({ editor }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ view, state }) => {
        const { selection } = state;

        // Получаем DOM-элемент в позиции курсора
        const domResult = view.domAtPos(selection.from);
        if (!domResult || !domResult.node) return false;

        // Безопасно ищем родительский элемент ошибки
        const targetElement = domResult.node.nodeType === Node.TEXT_NODE
          ? domResult.node.parentElement
          : (domResult.node as HTMLElement);

        const errorSpan = targetElement?.closest('.hunspell-error');

        if (errorSpan) {
          const rawSuggestions = errorSpan.getAttribute('data-suggestions');
          if (rawSuggestions) {
            // Чтобы избежать бесконечного цикла рендеринга React в shouldShow, 
            // проверяем, изменились ли подсказки
            const parsed = JSON.parse(rawSuggestions);
            if (JSON.stringify(suggestions) !== JSON.stringify(parsed)) {
              setSuggestions(parsed);
            }
            return true;
          }
        }
        return false;
      }}
    >
      <div className="spellcheck-bubble-menu" style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        padding: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        maxHeight: '200px',
        overflowY: 'auto',
      }}>
        {suggestions.length === 0 ? (
          <div style={{ padding: '6px 12px', fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
            Нет вариантов замены
          </div>
        ) : (
          suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => {
                // Находим родительский span с классом ошибки, по которому кликнули
                // e.currentTarget — это кнопка, нам нужно найти элемент в самом редакторе.
                // Для этого мы можем безопасно получить активный элемент через view.
                const view = editor.view;
                const { selection } = view.state;

                // Находим DOM-ноду, на которой сейчас стоит курсор
                const domResult = view.domAtPos(selection.from);
                if (!domResult || !domResult.node) return;

                const targetElement = domResult.node.nodeType === Node.TEXT_NODE
                  ? domResult.node.parentElement
                  : (domResult.node as HTMLElement);

                const errorSpan = targetElement?.closest('.hunspell-error') as HTMLElement;

                if (errorSpan) {
                  // Использованием встроенного метода ProseMirror для точного определения 
                  // числовых координат начала и конца конкретного DOM-элемента <span>
                  const start = view.posAtDOM(errorSpan, 0);
                  const end = start + errorSpan.innerText.length;

                  // Выполняем атомарную замену строго в границах этого span
                  editor
                    .chain()
                    .focus()
                    .insertContentAt({ from: start, to: end }, suggestion)
                    .run();
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px 12px',
                textAlign: 'left',
                fontSize: '14px',
                cursor: 'pointer',
                borderRadius: '4px',
                width: '100%',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {suggestion}
            </button>
          ))
        )}
      </div>
    </BubbleMenu>
  );
};
