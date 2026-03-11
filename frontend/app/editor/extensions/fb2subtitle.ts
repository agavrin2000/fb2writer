import { Node } from '@tiptap/core'

export const Fb2Subtitle = Node.create({
    name: 'fb2Subtitle',
    group: 'block',
    content: 'inline*',
    parseHTML: () => [{ tag: 'subtitle' }],
    renderHTML: () => ['h4', { class: 'fb2-subtitle' }, 0],
})