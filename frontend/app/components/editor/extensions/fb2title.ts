import { Node, mergeAttributes, CommandProps } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { findParentNodeByType } from "@/utils/utils";

const TARGET_TYPES = ["fb2Section", "fb2BodySection", "fb2Poem", "fb2Stanza"];

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
              selection.node.type.name === "fb2Poem" ||
              selection.node.type.name === "fb2Stanza")
          ) {
            sectionPos = selection.from;
            sectionNode = selection.node;
          }
          // 2. Если нет — ищем родительскую секцию вверх по дереву
          else {
            ({ pos: sectionPos, node: sectionNode } = findParentNodeByType(
              selection,
              TARGET_TYPES,
            ));
          }
          // Если не нашли секцию или  — блокируем команду
          if (sectionPos == -1) return false;

          const isBody = sectionNode.type.name === "fb2BodySection";
          const targetIndex = isBody ? 1 : 0;

          // Проверяем наличие заголовка на нужной позиции
          if (sectionNode.maybeChild(targetIndex)?.type.name === "fb2Title")
            return false;

          if (dispatch) {
            // Вычисляем позицию: начало секции + 1 (вход в ноду) + размер первого ребенка (если это Body)
            const offset =
              isBody && sectionNode.firstChild
                ? sectionNode.firstChild.nodeSize
                : 0;
            const insertPos = sectionPos + 1 + offset;
            return chain()
              .insertContentAt(insertPos, {
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
          const { selection } = state;
          let titlePos = -1;
          let titleNodeSize = 0;

          // 1. Если выделена вся нода (fb2Section)
          if (
            selection instanceof NodeSelection &&
            TARGET_TYPES.includes(selection.node.type.name)
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
            ({ pos: titlePos, nodeSize: titleNodeSize } = findParentNodeByType(
              selection,
              ["fb2Title"],
            ));
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
