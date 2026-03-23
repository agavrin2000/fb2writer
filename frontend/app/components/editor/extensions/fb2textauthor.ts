import { Node, mergeAttributes } from "@tiptap/core";
import { CommandProps } from "@tiptap/core";

export const Fb2TextAuthor = Node.create({
  name: "fb2TextAuthor",
  group: "block",
  content: "inline*",
  defining: true, // Важно: сохраняет узел при вставке контента или нажатии Enter
  selectable: true,
  parseHTML: () => [{ tag: "p.text-author" }, { tag: "text-author" }],
  renderHTML: ({ HTMLAttributes }) => [
    "p",
    mergeAttributes(HTMLAttributes, { class: "fb2-text-author" }),
    0,
  ],
  addCommands(): any {
    return {
      insertFb2TextAuthor:
        () =>
        ({ state, chain }: CommandProps) => {
          const { selection } = state;
          const $pos = selection.$from;

          // 1. Ищем глубину (depth) ближайшего родителя-эпиграфа или цитаты
          let depth = $pos.depth;
          while (depth > 0 && $pos.node(depth).type.name !== "fb2Epigraph" && $pos.node(depth).type.name !== "fb2Cite") {
            depth--;
          }

          // Если мы не внутри эпиграфа — выходим
          if (depth === 0) return false;

          // 2. Позиция вставки — перед закрывающим тегом эпиграфа
          const insertPos = $pos.after(depth) - 1;

          return chain()
            .insertContentAt(insertPos, {
              type: "fb2TextAuthor",
              content: [{ type: "text", text: "Автор текста" }],
            })
            .focus(insertPos + 1) // Смещение +1, так как структуры стало меньше
            .run();
        },
      removeFb2TextAuthor:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          const { $from } = state.selection;
          let textAuthorPos = -1;
          let textAuthorNodeSize = 0;

          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "fb2TextAuthor") {
              textAuthorPos = $from.before(d);
              textAuthorNodeSize = node.nodeSize;
              break;
            }
          }

          if (textAuthorPos === -1) return false;

          if (dispatch) {
            const focusPos = textAuthorPos - 1;
            return chain()
              .deleteRange({
                from: textAuthorPos,
                to: textAuthorPos + textAuthorNodeSize,
              })
              .focus(focusPos)
              .run();
          }
          return true;
        },
    };
  },
});
