import { Node } from '@tiptap/core'
import BlockQuote from '@tiptap/extension-blockquote';

export const Fb2Cite = BlockQuote.extend({
    name: 'fb2Cite',
    addAttributes() {
        return {
            ...this.parent?.(),
            class: { default: 'fb2-cite' }
        }
    }
})


/*
export const Fb2Cite = Node.create({
    name: 'fb2Cite',
    group: 'block',
    content: '(paragraph | fb2Subtitle | fb2Poem)+ fb2TextAuthor*',
    parseHTML: () => [{ tag: 'cite' }],
    renderHTML: () => ['cite', { class: 'fb2-cite' }, 0],
})*/