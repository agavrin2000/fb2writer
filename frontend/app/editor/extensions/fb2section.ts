import { Node, mergeAttributes, Mark } from '@tiptap/core'

export const Fb2Section = Node.create({
    name: 'fb2Section',
    group: 'block',
    content: 'fb2Title? (block | fb2Section)+', // Секция требует заголовок (опц) и контент
//    content: 'block+', // Секция требует заголовок (опц) и контент
    defining: true, // Важно: сохраняет структуру при вставке
    parseHTML() {
        return [{ tag: 'section.fb2-section' }]
    },
    renderHTML({ HTMLAttributes }) {
        return [
            'section',
            mergeAttributes(HTMLAttributes, { class: 'fb2-section' }),
            0
        ]
    },
})