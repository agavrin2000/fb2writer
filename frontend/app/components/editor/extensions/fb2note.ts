import { Node, mergeAttributes, Mark } from '@tiptap/core'

export const Fb2Note = Mark.create({
    name: 'fb2Note',
    addAttributes() {
        return {
            href: { default: null },
            type: { default: 'note' },
        }
    },
    parseHTML: () => [{ tag: 'a[type="note"]' }],
    renderHTML: (HTMLAttributes) => ['a', mergeAttributes(HTMLAttributes), 0],
})