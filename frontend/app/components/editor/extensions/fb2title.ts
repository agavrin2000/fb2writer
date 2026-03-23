import { Node, mergeAttributes } from "@tiptap/core";
import { CommandProps } from "@tiptap/core";

export const Fb2Title = Node.create({
  name: "fb2Title",
  group: "block",
  content: "paragraph+",
  defining: true, // Важно: сохраняет узел при вставке контента или нажатии Enter
  selectable: false,
  isolating: true,
  draggable: false,

  parseHTML: () => [{ tag: "div.fb2-title" }, { tag: "title" }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, {
      // text-center — по центру, font-bold — жирный, mb-4 — отступ снизу
      class: "fb2-title text-center font-bold mb-4 my-6 tracking-wide",
    }),
    0,
  ],
  addCommands(): any {
    return {
      insertFb2Title:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          const { selection } = state;
          const $pos = selection.$from;
          // 1. Ищем ближайшего родителя-секцию
          let sectionPos = -1;
          let sectionNode = null;

          for (let d = $pos.depth; d > 0; d--) {
            const sectionType = state.schema.nodes["fb2Section"];
            if (sectionType && $pos.node(d).type === sectionType) {
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
          if (hasTitle) {
            return false;
          }
          // 3. Выполняем вставку (всегда в начало секции)
          if (dispatch) {
            return chain()
              .insertContentAt(sectionPos + 1, {
                type: "fb2Title",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Заголовок" }],
                  },
                ],
              })
              .focus('start')
              .run();
          }
          return true;
        },

      removeFb2Title:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          const { $from } = state.selection;
          let titlePos = -1;
          let titleNodeSize = 0;

          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "fb2Title") {
              titlePos = $from.before(d);
              titleNodeSize = node.nodeSize; // Берем размер ВСЕГО заголовка
              break;
            }
          }

          if (titlePos === -1) return false;

          if (dispatch) {
            return chain()
              .deleteRange({ from: titlePos, to: titlePos + titleNodeSize })
              .focus()
              .run();
          }
          return true;
        },
    };
  },
});
