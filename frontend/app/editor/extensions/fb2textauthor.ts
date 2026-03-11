import { Node } from '@tiptap/core'

export const Fb2TextAuthor = Node.create({
    name: 'fb2TextAuthor',
    group: 'block',
    content: 'inline*',
    parseHTML: () => [{ tag: 'text-author' }],
    renderHTML: () => ['p', { class: 'fb2-text-author' }, 0],
})
