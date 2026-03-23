import { Node, mergeAttributes } from "@tiptap/core";
import { CommandProps } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";

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
      class: "fb2-title ",
    }),
    0,
  ],
  addCommands(): any {
    return {
      insertFb2Title:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          const { selection } = state;
          let sectionPos = -1;
          let sectionNode = null;

          // 1. Проверяем: выделена ли сама секция?
          if (
            selection instanceof NodeSelection &&
            (selection.node.type.name === "fb2Section" ||
              selection.node.type.name === "fb2BodySection" ||
              selection.node.type.name === "fb2Poem" ||
              selection.node.type.name === "fb2Stanza")
          ) {
            sectionPos = selection.from;
            sectionNode = selection.node;
          }
          // 2. Если нет — ищем родительскую секцию вверх по дереву
          else {
            const { $from } = selection;
            for (let d = $from.depth; d > 0; d--) {
              const node = $from.node(d);
              if (
                node.type.name === "fb2Section" ||
                node.type.name === "fb2BodySection" ||
                node.type.name === "fb2Poem" ||
                node.type.name === "fb2Stanza"
              ) {
                sectionPos = $from.before(d);
                sectionNode = node;
                break;
              }
            }
          }

          // Если не нашли секцию или заголовок уже есть — блокируем команду
          if (!sectionNode) return false;

          const firstChild = sectionNode.firstChild;
          const hasTitle = firstChild?.type.name === "fb2Title";

          if (hasTitle) return false;

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
              .focus(sectionPos + 2) // Фокусируемся внутри нового заголовка
              .run();
          }

          return true;
        },
      removeFb2Title:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          const { selection, doc } = state;
          let titlePos = -1;
          let titleNodeSize = 0;

          // 1. Если выделена вся нода (fb2Section)
          if (
            selection instanceof NodeSelection &&
            (selection.node.type.name === "fb2Section" ||
              selection.node.type.name === "fb2BodySection")
          ) {
            selection.node.forEach((child, offset) => {
              if (child.type.name === "fb2Title") {
                titlePos = selection.from + 1 + offset;
                titleNodeSize = child.nodeSize;
              }
            });
          }
          // 2. Если курсор внутри (обычное выделение)
          else {
            const { $from } = selection;
            for (let d = $from.depth; d > 0; d--) {
              const node = $from.node(d);
              if (node.type.name === "fb2Title") {
                titlePos = $from.before(d);
                titleNodeSize = node.nodeSize;
                break;
              }
            }
          }

          // Если заголовок не найден, команда "не может" быть выполнена
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
