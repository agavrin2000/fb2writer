import { BubbleMenu } from '@tiptap/react/menus';
import { isNodeSelection } from '@tiptap/react';
import { Trash2, Heading, ListPlus, ListEnd, ListStart } from 'lucide-react'
import { Editor } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { Fb2ActionIcon } from '../ui/Fb2ActionIcon'
import React, { useState, useEffect } from 'react'

interface SectionBubbleMenuProps {
    editor: Editor | null;
}
export const SectionBubbleMenu: React.FC<SectionBubbleMenuProps> = ({ editor }) => {
    if (!editor) return null

    // Добавить новую секцию
    type InsertPosition = 'after' | 'start' | 'end';

    const addFb2Section = (position: InsertPosition) => {
        const { selection } = editor.state;

        if (isNodeSelection(selection) && selection.node.type.name === 'fb2Section') {
            const node = selection.node;
            const currentLevel = node.attrs.level || 1;

            let insertPos: number;
            let targetLevel: number;

            // Определяем логику позиции и уровня
            switch (position) {
                case 'after':
                    insertPos = selection.to;
                    targetLevel = currentLevel; // Тот же уровень
                    break;
                case 'start':
                    insertPos = selection.from + 1;
                    targetLevel = currentLevel + 1; // Уровень глубже
                    break;
                case 'end':
                    insertPos = selection.to - 1;
                    targetLevel = currentLevel + 1; // Уровень глубже
                    break;
                default:
                    return;
            }
            editor.chain()
                .focus()
                .insertContentAt(insertPos, {
                    type: "fb2Section",
                    attrs: { level: targetLevel },
                    content: [
                        {
                            type: "fb2Title",
                            content: [{ type: "paragraph", content: [{ type: "text", text: "Новый раздел" }] }]
                        },
                        {
                            type: "paragraph",
                            content: [{ type: "text", text: "Текст нового раздела" }]
                        }
                    ]
                }).run();
        }
    };

    return (
        <BubbleMenu
            editor={editor}
            updateDelay={0}
            pluginKey="section-bubble-menu"
            shouldShow={({ state, editor }) => {
                const { selection } = state;
                // 1. ЕСЛИ ЭТО ОБЫЧНЫЙ КУРСОР (текст) — СРАЗУ FALSE
                // Это остановит проверки при перемещении внутри параграфов
                if (!(selection instanceof NodeSelection)) {
                    return false;
                }
                // 1. Проверяем, что выделена именно секция
                const isSection = isNodeSelection(state.selection) && state.selection.node.type.name === 'fb2Section'

                // Если секция уже выделена, и мы не кликали по ручке (например, печатаем)
                // решаем, оставить ли меню открытым или скрыть.
                // Обычно лучше оставить, пока выделена секция:
                return isSection
            }}

     //       options={{ placement: 'right-start', offset: 40 }}
                  options={{
        placement: 'right-start',
        // Floating UI использует offset для отступа [crossAxis, mainAxis]
          offset: {
    mainAxis: 10,  // Отступ вправо от ручки
    crossAxis: 0,   // Смещение вверх/вниз относительно верхнего края ручки
  },
        // Принудительно рендерим в портал (body), чтобы sticky-родители не обрезали меню
        flip: true, 
        
        // САМОЕ ВАЖНОЕ: Переопределяем виртуальную область привязки
    getReferenceClientRect: (() => {
      const { selection } = editor.state;
      const dom = editor.view.nodeDOM(selection.from) as HTMLElement;
      const handle = dom?.querySelector('.section-handle');
      return handle ? handle.getBoundingClientRect() : null;
    }) as any,
  } as any}
    >
            <div style={toolbarStyle} key={`${editor.state.selection.from}-${editor.state.tr.steps.length}`}>
                {/* Добавить секцию */}
                <button onClick={() => addFb2Section('after')} style={btnStyle} title="Добавить раздел">
                    <ListPlus size={14} />
                </button>

                {/* Создание подсекции в начале */}
                <button onClick={() => addFb2Section('start')} style={btnStyle} title="Вставить подраздел в начало">
                    <ListStart size={14} />
                </button>

                {/* Создание подсекции в конце */}
                <button onClick={() => addFb2Section('end')} style={btnStyle} title="Вставить подраздел в конец">
                    <ListEnd size={14} />
                </button>

                {/* Кнопка удаления */}
                <button
                    onClick={() => editor.commands.deleteSelection()} style={{ ...btnStyle, color: '#ef4444' }} title="Удалить раздел">
                    <Trash2 size={14} />
                </button>
            </div>
        </BubbleMenu>
    );
};

// Стили тулбара
const toolbarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '4px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    gap: '2px',
};

const btnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    padding: '6px 10px',
    cursor: 'pointer',
    borderRadius: '4px',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    transition: 'background 0.2s',
};

const separatorStyle: React.CSSProperties = {
    width: '1px',
    height: '20px',
    backgroundColor: '#e2e8f0',
    margin: '0 4px',
};