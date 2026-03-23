import { Node, mergeAttributes } from "@tiptap/core";
import { CommandProps } from "@tiptap/core";

export const Fb2Epigraph = Node.create({
  name: "fb2Epigraph",
  group: "block",
  content: "(paragraph | fb2Cite | fb2Poem)+ fb2TextAuthor*",
  defining: true, // Важно: сохраняет узел при вставке контента или нажатии Enter
  selectable: true,
  parseHTML: () => [{ tag: "div.fb2-epigraph" }, { tag: "epigraph" }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, {
      class:
        "fb2-epigraph",
    }),
    0,
  ],
  addCommands(): any {
    return {
      insertFb2Epigraph:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          const { selection } = state;
          const $pos = selection.$from;
          // 1. Ищем ближайшего родителя-секцию
          let sectionPos = -1;
          let sectionNode = null;

          for (let d = $pos.depth; d > 0; d--) {
            if ($pos.node(d).type.name === "fb2Section") {
              sectionPos = $pos.before(d);
              sectionNode = $pos.node(d);
              break;
            }
          }
          // Если мы не внутри секции — команда недоступна
          if (!sectionNode) {
            return false;
          }

          // 2. Проверяем, есть ли уже заголовок в этой секции
          let hasTitle = false;
          sectionNode.content.forEach((child) => {
            if (child.type.name === "fb2Title") hasTitle = true;
          });

          // 3. Выполняем вставку (в начало секции или после заголовка)
          if (dispatch) {
            let insertPos = sectionPos + 1; // По умолчанию в начало секции

            // Если заголовок есть, ищем его точный размер
            if (hasTitle) {
              sectionNode.content.forEach((child, offset) => {
                if (child.type.name === "fb2Title") {
                  // Позиция ПОСЛЕ заголовка = начало контента секции + смещение до узла + размер узла
                  insertPos = sectionPos + 1 + offset + child.nodeSize;
                }
              });
            }

            return chain()
              .insertContentAt(insertPos, {
                type: "fb2Epigraph",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Эпиграф" }],
                  },
                ],
              })
              .focus(insertPos + 1) // Фокус на первый параграф внутри нового эпиграфа
              .run();
          }
          return true;
        },

      removeFb2Epigraph:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          const { $from } = state.selection;
          let epigraphPos = -1;
          let epigraphNodeSize = 0;

          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "fb2Epigraph") {
              epigraphPos = $from.before(d);
              epigraphNodeSize = node.nodeSize; // Берем размер ВСЕГО эпиграфа
              break;
            }
          }

          if (epigraphPos === -1) return false;

          if (dispatch) {
            return chain()
              .deleteRange({
                from: epigraphPos,
                to: epigraphPos + epigraphNodeSize,
              })
              .focus()
              .run();
          }
          return true;
        },
    };
  },
});
