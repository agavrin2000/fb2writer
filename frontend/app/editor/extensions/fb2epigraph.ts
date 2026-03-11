import { Node, mergeAttributes } from '@tiptap/core'

export const Fb2Epigraph = Node.create({
    name: 'fb2Epigraph',
    group: 'block',
    content: 'paragraph+ fb2TextAuthor?',
    parseHTML: () => [{ tag: 'epigraph' }],
    renderHTML: () => ['blockquote', { class: 'fb2-epigraph' }, 0],
})