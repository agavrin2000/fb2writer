import { Node, mergeAttributes } from "@tiptap/core";
import { CommandProps } from "@tiptap/core";

export const Fb2Stanza = Node.create({
  name: "fb2Stanza",
  group: "block",
  content: "fb2Title? fb2Subtitle? fb2V+",
  defining: true, // Важно: сохраняет узел при вставке контента или нажатии Enter
  isolating: true,
  selectable: true,
  parseHTML: () => [{ tag: "div.fb2-stanza" }, { tag: "stanza" }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, {
      class: "fb2-stanza",
    }),
    0,
  ],
  addCommands() {
    return {
      insertFb2Stanza:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          const { $from } = state.selection;

          // Проверка контекста
          for (let d = $from.depth; d > 0; d--) {
            const name = $from.node(d).type.name;
            if (["fb2Title", "fb2Subtitle", "fb2Stanza"].includes(name))
              return false;
          }

          if (dispatch) {
            return chain()
              .insertContent({
                type: "fb2Stanza",
                content: [
                  {
                    type: "fb2Stanza",
                    content: [
                      {
                        type: "fb2V", // Убедитесь, что это расширение подключено в editor
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
      removeFb2Stanza:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          const { $from } = state.selection;
          let StanzaPos = -1;
          let StanzaNodeSize = 0;

          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "fb2Stanza") {
              StanzaPos = $from.before(d);
              StanzaNodeSize = node.nodeSize;
              break;
            }
          }

          if (StanzaPos === -1) return false;

          if (dispatch) {
            return chain()
              .deleteRange({ from: StanzaPos, to: StanzaPos + StanzaNodeSize })
              .focus()
              .run();
          }
          return true;
        },
    } as any;
  },
});
