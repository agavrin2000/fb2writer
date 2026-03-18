import { Node, mergeAttributes } from "@tiptap/core";

export const Fb2V = Node.create({
  name: "fb2V",
  content: "inline*",
  group: "block", // Позволяет существовать внутри stanza
  defining: true,

  parseHTML: () => [{ tag: "p.fb2-v" }, { tag: "v" }],
  renderHTML: ({ HTMLAttributes }) => [
    "p",
    mergeAttributes(HTMLAttributes, { class: "fb2-v leading-relaxed min-h-[1em]" }),
    0,
  ],

  addKeyboardShortcuts() {
    return {
      // При нажатии Enter создаем новую строку стиха (fb2V)
      Enter: () => this.editor.commands.splitBlock(),
    };
  },
});