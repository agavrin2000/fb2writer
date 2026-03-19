import { NodeViewContent, NodeViewWrapper, NodeViewProps, isNodeSelection } from '@tiptap/react'
import React, { useState, useEffect } from 'react'
import { NodeSelection } from '@tiptap/pm/state'

export const SectionComponent: React.FC<NodeViewProps> = (props) => {
    const { editor, getPos } = props // Убрали лишний selected
    const [isCurrentSelected, setIsCurrentSelected] = useState(false)

    useEffect(() => {
        const checkSelection = () => {
            const { selection } = editor.state
            const pos = getPos()

            // Важно: проверяем, что pos — это число, прежде чем сравнивать
            if (typeof pos === 'number') {
                const isSelected = selection instanceof NodeSelection && selection.from === pos
                setIsCurrentSelected(isSelected)
            }
        }

        editor.on('selectionUpdate', checkSelection)
        // Вызываем один раз сразу, чтобы поймать состояние при монтировании
        checkSelection()

        return () => {
            editor.off('selectionUpdate', checkSelection)
        }
    }, [editor]) // Убрали getPos из зависимостей для стабильности

    const selectSection = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        const pos = getPos()
        if (typeof pos !== 'number') return

        const { selection } = editor.state
        const isCurrentlySelected = selection instanceof NodeSelection && selection.from === pos

        if (isCurrentlySelected) {
            // Снимаем выделение: ставим курсор ВНУТРЬ секции (pos + 1)
            // Если поставить просто pos, курсор будет ПЕРЕД секцией
            editor.commands.setTextSelection(pos + 1)
        } else {
            editor.chain()
                .focus()
                .setNodeSelection(pos)
                .run()
        }
    }
    return (
        <NodeViewWrapper
            // Используем локальный стейт для класса
            className={`section-node-wrapper ${isCurrentSelected ? 'is-selected' : ''}`}
            style={{ position: 'relative', overflow: 'visible' }}
        >
            <div
                className="section-handle" // Все визуальные стили теперь здесь
                contentEditable={false}
                onMouseDown={selectSection}
                style={{
                    position: 'sticky',
                    top: '20px',
                    float: 'right',
                    marginRight: '-30px',
                    zIndex: 100,
                    // Больше никаких динамических backgroundColor и border!
                }}
            >
                ⠿
            </div>

            <NodeViewContent as={("section" as any)} className="fb2-section" />
        </NodeViewWrapper>
    )
}