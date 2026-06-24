import { Node, mergeAttributes } from "@tiptap/core";

export const Fb2V = Node.create({
  name: "fb2V",
  content: "inline*",
  group: "block", // Позволяет существовать внутри stanza
  defining: true,
  addAttributes() {
    return {
      // Добавляем атрибут id
      id: {
        default: null,
        // Отрисовка в HTML: добавляем атрибут id к тегу <p>
        renderHTML: (attributes) => {
          return attributes.id ? { id: attributes.id } : {};
        },
        // Парсинг из HTML: ищем атрибут id в теге <p>
        parseHTML: (element) => element.getAttribute("id") || undefined,
      },
    };
  },
  parseHTML: () => [{ tag: "p.fb2-v" }, { tag: "v" }],
  renderHTML: ({ HTMLAttributes }) => [
    "p",
    mergeAttributes(HTMLAttributes, { class: "fb2-v" }),
    0,
  ],
});
