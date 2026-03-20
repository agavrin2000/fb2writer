import { Node, mergeAttributes } from "@tiptap/core";

export const Fb2Section = Node.create({
  name: "fb2Section",
  group: "block",
  content: "fb2Title? fb2Epigraph* fb2BlockImage? fb2Annotation? (block | fb2Section)+",
  defining: true,
  selectable: true,
  isolating: true,
  addAttributes() {
    return {
      level: { default: 2 },
      sectionId: {
        default: null,
        // Убираем здесь renderHTML, чтобы Tiptap не вешал id на внешний div
        parseHTML: (element) => element.getAttribute("id"),
      },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement("div");
      dom.className = "section-node-wrapper";
    const content = document.createElement("section");
    content.className = "fb2-section";
    
    // Ручная установка ID строго на внутренний тег
    if (node.attrs.sectionId) {
      content.id = node.attrs.sectionId;
    }
      const handle = document.createElement("div");
      handle.className = "section-handle";
      handle.innerText = "⠿";
      handle.contentEditable = "false";
      handle.onclick = () => {
        const pos = getPos();
        if (typeof pos === "number") {
          editor.commands.setNodeSelection(pos);
        }
      };

      // КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: вешаем ID прямо на тег <section>
      if (node.attrs.sectionId) {
        content.id = node.attrs.sectionId;
      }

      dom.append(handle, content);
      return { dom, contentDOM: content };
    };
  },
});
