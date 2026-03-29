import BlockQuote from "@tiptap/extension-blockquote";

export const Fb2Cite = BlockQuote.extend({
  name: "fb2Cite",
  addAttributes() {
    return {
      ...this.parent?.(),
      class: { default: "fb2-cite" },
    };
  },
});
