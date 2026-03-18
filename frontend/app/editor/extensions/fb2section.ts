import { Node, mergeAttributes } from "@tiptap/core";


/*declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    insertSection: () => ReturnType;
    deleteSection: () => ReturnType;
  }
}*/

export const Fb2Section = Node.create({
  name: "fb2Section",
  group: "block",
  content: "fb2Title? fb2Epigraph* blockImage? (block | fb2Section)+",
  defining: true,
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
  parseHTML: () => [{ tag: "section" }],
  renderHTML: ({ HTMLAttributes }) => [
    "section",
    mergeAttributes(HTMLAttributes, { class: "fb2-section border-l-2 border-blue-100 pl-4 my-6" }),
    0,
  ],

  addCommands(): any {
    return {
      insertSection: () => ({ chain }: any) => {
        return chain()
          .insertContent({
            type: "fb2Section",
            content: [
              { type: "fb2Title", content: [{ type: "paragraph", text: "Новая глава" }] },
              { type: "paragraph" }
            ]
          })
          .focus()
          .run();
      },
      deleteSection: () => ({ commands }: any) => {
        return commands.deleteNode("fb2Section");
      },
    };
  },
});
