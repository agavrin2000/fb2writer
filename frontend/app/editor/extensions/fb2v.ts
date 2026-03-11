import { Node } from '@tiptap/core'

export const Fb2V = Node.create({
    name: 'fb2V',
    content: 'inline*',
    parseHTML: () => [{ tag: 'v' }], // Тег <v> в XML
    renderHTML: () => ['p', { class: 'fb2-v' }, 0],
})