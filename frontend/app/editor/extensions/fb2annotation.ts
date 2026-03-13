import { Node } from '@tiptap/core'

export const Fb2Annotation = Node.create({
    name: 'fb2Cite',
    group: 'block',
    content: '(paragraph | fb2Poem | fb2Subtitle | fb2Cite | fb2Table)+',
    parseHTML: () => [{ tag: 'cite' }],
    renderHTML: () => ['cite', { class: 'fb2-cite' }, 0],
})