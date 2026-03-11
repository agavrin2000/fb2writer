import { Node, mergeAttributes } from '@tiptap/core'

export const Fb2Title = Node.create({
    name: 'fb2Title',
    group: 'block',
    content: 'paragraph+',
    parseHTML: () => [{ tag: 'title' }],
    renderHTML: (HTMLAttributes) => ['div', mergeAttributes(HTMLAttributes, { class: 'fb2-title' }), 0],
})