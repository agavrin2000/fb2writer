import { Node } from '@tiptap/core'

export const Fb2Poem = Node.create({
    name: 'fb2Poem',
    group: 'block',
    content: 'fb2Title? fb2Epigraph* fb2Stanza+ fb2TextAuthor* fb2Date?',
    parseHTML: () => [{ tag: 'poem' }],
    renderHTML: () => ['div', { class: 'fb2-poem' }, 0],
})