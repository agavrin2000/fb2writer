import { Node, mergeAttributes } from "@tiptap/core";
import { CommandProps } from "@tiptap/core";
import { findParentNodeByType } from "../../../utils/utils";

export const Fb2Subtitle = Node.create({
  name: "fb2Subtitle",
  group: "block",
  content: "inline*",
  defining: true, // Важно: сохраняет узел при вставке контента или нажатии Enter
  selectable: true,
  parseHTML: () => [{ tag: "p.subtitle" }, { tag: "subtitle" }],
  renderHTML: ({ HTMLAttributes }) => [
    "p",
    mergeAttributes(HTMLAttributes, {
      class: "fb2-subtitle fb2-labeled-node",
      "data-label": "Подзаголовок",
    }),
    0,
  ],
  addAttributes() {
    return {
      id: {
        default: null,
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {};
          }
          return { id: attributes.id };
        },
        parseHTML: (element) => element.getAttribute("id"),
      },
    };
  },

  addCommands() {
    return {
      insertFb2Subtitle:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          const { selection } = state;
          const { $from } = selection;

          // 1. Ищем ближайшего родителя (Секция или Строфа)
          let parentNode = null;
          let parentPos = -1;

          ({ pos: parentPos, node: parentNode } = findParentNodeByType(
            selection,
            [
              "fb2Title",
              "fb2Epigraph",
              "fb2Subtitle",
              "fb2Textauthor",
              "fb2Date",
              "fb2Section",
              "fb2Stanza",
              "fb2Cite",
            ],
          ));

          if (
            !parentNode ||
            [
              "fb2Title",
              "fb2Epigraph",
              "fb2Subtitle",
              "fb2Textauthor",
              "fb2Date",
            ].includes(parentNode.type.name)
          )
            return false;

          let insertPos = $from.pos;

          // 2. ЛОГИКА ДЛЯ СТРОФЫ (fb2Stanza)
          if (parentNode.type.name === "fb2Stanza") {
            let hasSubtitle = false;
            let titleOffset = 0;

            // Быстро проверяем структуру строфы (в ней мало узлов)
            parentNode.forEach((child) => {
              if (child.type.name === "fb2Subtitle") hasSubtitle = true;
              if (child.type.name === "fb2Title") titleOffset = child.nodeSize;
            });

            // Если подзаголовок уже есть — выходим
            if (hasSubtitle) return false;

            // Вставляем строго после title (если его нет, titleOffset будет 0)
            insertPos = parentPos + 1 + titleOffset;
          }

          if (dispatch) {
            return chain()
              .insertContentAt(insertPos, {
                type: "fb2Subtitle",
                content: [{ type: "text", text: "Подзаголовок" }],
              })
              .focus(insertPos + 2)
              .run();
          }
          return true;
        },
      removeFb2Subtitle:
        () =>
        ({ state, chain, dispatch }: CommandProps) => {
          // Ищем, находимся ли мы внутри fb2Subtitle
          const { pos: subtitlPos, nodeSize: subtitleNodeSize } =
            findParentNodeByType(state.selection, ["fb2Subtitle"]);

          // Если не нашли — команда недоступна
          if (subtitlPos === -1) return false;

          // Удаляем узел и возвращаем фокус
          if (dispatch) {
            return chain()
              .deleteRange({
                from: subtitlPos,
                to: subtitlPos + subtitleNodeSize,
              })
              .focus()
              .run();
          }
          return true;
        },
    };
  },
});
