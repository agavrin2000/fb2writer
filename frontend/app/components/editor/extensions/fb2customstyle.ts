import { mergeAttributes, Mark } from '@tiptap/core'

export const Fb2CustomStyle = Mark.create({
    name: 'fb2CustomStyle',
    addAttributes() {
        return {
            name: {
                default: null,
                parseHTML: (element: HTMLElement) => element.getAttribute('name'),
                renderHTML: (attributes) => ({ name: attributes.name }),
            },
        }
    },
    parseHTML() {
        return [{ tag: 'style' }]
    },
    renderHTML({HTMLAttributes}) {
        return ['span', mergeAttributes(HTMLAttributes, { class: `fb2-style-${HTMLAttributes.name}` }), 0]
    },
})
