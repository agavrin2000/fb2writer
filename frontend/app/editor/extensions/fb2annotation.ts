import { Node } from '@tiptap/core'

export const Fb2Annotation = Node.create({
    name: 'fb2Annotation',
    group: 'block',
    content: '(paragraph | fb2Poem | fb2Subtitle | fb2Cite)+',
    parseHTML: () => [{ tag: 'annotation' }],
    renderHTML: () => ['cite', { class: 'fb2-annotation' }, 0],
})