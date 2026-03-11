import { Node } from '@tiptap/core'

export const Fb2Stanza = Node.create({
    name: 'fb2Stanza',
    content: 'fb2V',
    parseHTML: () => [{ tag: 'stanza' }],
    renderHTML: () => ['div', { class: 'fb2-stanza' }, 0],
})