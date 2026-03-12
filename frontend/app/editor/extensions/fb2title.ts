import { Node, mergeAttributes } from "@tiptap/core";

export const Fb2Title = Node.create({
  name: "fb2Title",
  group: "block",
  content: "paragraph+",
  defining: true, // Важно: сохраняет узел при вставке контента или нажатии Enter
  selectable: true,

  parseHTML: () => [{ tag: "div.fb2-title" }, { tag: "title" }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, {
      // text-center — по центру, font-bold — жирный, mb-4 — отступ снизу
      class:
        "fb2-title text-center font-bold mb-4 my-6 uppercase tracking-wide",
    }),
    0,
  ],
});
