import { Node, mergeAttributes } from "@tiptap/core";

export const Fb2Section = Node.create({
  name: "fb2Section",
  group: "block",
  content: "fb2Title? fb2Epigraph* blockImage? (block | fb2Section)+",
  defining: true,
  selectable: true,
  isolating: true,
    addAttributes() {
        return {
            level: {
                // Это значение будет использоваться, если в JSON нет поля level
                default: 1,
                // Позволяет Tiptap подхватывать level из JSON (attrs: { level: ... })
                keepAttributes: true,
            },
        }
    },
  parseHTML: () => [{ tag: "section.fb2-section" }],
  renderHTML: ({ HTMLAttributes }) => [
    "section",
    mergeAttributes(HTMLAttributes, { class: "fb2-section" }),
    0,
  ],
  /*addNodeView() {
    return ReactNodeViewRenderer(SectionComponent)
  },*/
addNodeView() {
  return ({ node, editor, getPos }) => {
    const dom = document.createElement('div')
    dom.className = 'section-node-wrapper'
    
    const handle = document.createElement('div')
    handle.className = 'section-handle'
    handle.innerText = '⠿'
    handle.contentEditable = 'false'
   handle.onclick = () => {
      const pos = getPos();
      // Проверяем, что pos — это число, прежде чем передавать в команду
      if (typeof pos === 'number') {
        editor.commands.setNodeSelection(pos);
      }
    };

    const content = document.createElement('section')
    content.className = 'fb2-section'

    dom.append(handle, content)
    return { dom, contentDOM: content }
  }
}

});
