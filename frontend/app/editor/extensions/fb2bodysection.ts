import { Node, mergeAttributes } from "@tiptap/core";

export const Fb2BodySection = Node.create({
  name: "fb2BodySection",
  group: "block",
  content: "fb2BlockImage? fb2Title? fb2Epigraph* fb2Section+",
  defining: true,
  selectable: true,
  isolating: true,
  parseHTML: () => [{ tag: "section.fb2-bodysection" }],
  renderHTML: ({ HTMLAttributes }) => [
    "section",
    mergeAttributes(HTMLAttributes, { class: "fb2-bodysection" }),
    0,
  ],
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement("div");
      dom.className = "section-node-wrapper";

      const handle = document.createElement("div");
      handle.className = "section-handle";
      handle.innerText = "⠿";
      handle.contentEditable = "false";
      handle.onclick = () => {
        const pos = getPos();
        // Проверяем, что pos — это число, прежде чем передавать в команду
        if (typeof pos === "number") {
          editor.commands.setNodeSelection(pos);
        }
      };

      const content = document.createElement("section");
      content.className = "fb2-bodysection";

      dom.append(handle, content);
      return { dom, contentDOM: content };
    };
  },
});
