import { Node, mergeAttributes } from "@tiptap/core";
import { CommandProps } from "@tiptap/core";

export const Fb2Poem = Node.create({
  name: "fb2Poem",
  group: "block",
  content: "fb2Title? fb2Epigraph* fb2Stanza+ fb2TextAuthor* fb2Date",
  defining: true, // Важно: сохраняет узел при вставке контента или нажатии Enter
  isolating: true,
  selectable: true,
  parseHTML: () => [{ tag: "div.fb2-poem" }, { tag: "poem" }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, {
      class: "fb2-poem",
    }),
    0,
  ],
  addCommands() {
    return {
      insertFb2Poem:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          const { $from } = state.selection;

          // Проверка контекста
          for (let d = $from.depth; d > 0; d--) {
            const name = $from.node(d).type.name;
            if (["fb2Title", "fb2Subtitle", "fb2Poem"].includes(name))
              return false;
          }

          if (dispatch) {
            return chain()
              .insertContent({
                type: "fb2Poem",
                content: [
                  {
                    type: "fb2Stanza", 
                    content: [
                      {
                        type: "fb2V",
                        content: [{ type: "text", text: "Строфа" }],
                      },
                    ],
                  },
                ],
              })
              .focus()
              .run();
          }
          return true;
        },
      removeFb2Poem:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          const { $from } = state.selection;
          let poemPos = -1;
          let poemNodeSize = 0;

          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "fb2Poem") {
              poemPos = $from.before(d);
              poemNodeSize = node.nodeSize;
              break;
            }
          }

          if (poemPos === -1) return false;

          if (dispatch) {
            return chain()
              .deleteRange({ from: poemPos, to: poemPos + poemNodeSize })
              .focus()
              .run();
          }
          return true;
        },
    } as any;
  },
});
