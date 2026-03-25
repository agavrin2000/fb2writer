import Image from '@tiptap/extension-image';

// Блочное изображение (для структуры FB2)
export const Fb2BlockImage = Image.extend({
    name: 'fb2BlockImage',
    inline: false,
    group: 'block',
    selectable: true,
    draggable: true,
    addAttributes() {
        return {
            ...this.parent?.(),
            href: {
                default: null,
                parseHTML: (element) => element.getAttribute("elementId"),
                renderHTML: (attributes) => ({ href: attributes.href }),
            },
            title: {
                default: null,
                parseHTML: (element) => element.getAttribute("title"),
                renderHTML: (attributes) => ({ title: attributes.title }),
            },
            class: { default: 'block mx-auto my-4 rounded-lg shadow-md max-w-full' }
        }
    }
}).configure({ allowBase64: true });
