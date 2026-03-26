import { Node, mergeAttributes } from "@tiptap/core";
import { CommandProps } from "@tiptap/core";

export const Fb2Poem = Node.create({
  name: "fb2Poem",
  group: "block",
  content: "fb2Title? fb2Epigraph* fb2Stanza+ fb2TextAuthor* fb2Date?",
  defining: true,
  isolating: true,
  selectable: true,
  /*parseHTML: () => [{ tag: "div.fb2-poem" }, { tag: "poem" }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, {
      class: "fb2-poem",
    }),
    0,
  ],*/
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement("div");
      dom.className = "poem-node-wrapper";
      const content = document.createElement("poem");
      content.className = "fb2-poem";

      // Ручная установка ID строго на внутренний тег
      if (node.attrs.sectionId) {
        content.id = node.attrs.sectionId;
      }
      const handle = document.createElement("div");
      handle.className = "poem-handle";
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
                    type: "fb2Title", // Добавляем заголовок стиха
                    content: [
                      {
                        type: "paragraph",
                        content: [
                          { type: "text", text: "Заголовок стихотворения" },
                        ],
                      },
                    ],
                  },
                  {
                    type: "fb2Stanza",
                    content: [
                      {
                        type: "fb2V",
                        content: [{ type: "text", text: "Строка..." }],
                      },
                    ],
                  },
                  {
                    type: "fb2Date",
                    content: [{ type: "text", text: "Дата поэмы" }],
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
