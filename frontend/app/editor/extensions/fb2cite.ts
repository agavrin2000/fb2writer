import { Node } from '@tiptap/core'

export const Fb2Cite = Node.create({
    name: 'fb2Cite',
    group: 'block',
    content: 'paragraph+ fb2TextAuthor?',
    parseHTML: () => [{ tag: 'cite' }],
    renderHTML: () => ['cite', { class: 'fb2-cite' }, 0],
})