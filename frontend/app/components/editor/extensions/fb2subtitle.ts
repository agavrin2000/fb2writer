import { Node, mergeAttributes } from "@tiptap/core";
import { CommandProps } from "@tiptap/core";
import { findParentNodeByType } from "@/utils/utils";

export const Fb2Subtitle = Node.create({
  name: "fb2Subtitle",
  group: "block",
  content: "inline*",
  defining: true, // Важно: сохраняет узел при вставке контента или нажатии Enter
  selectable: true,
  parseHTML: () => [{ tag: "p.subtitle" }, { tag: "subtitle" }],
  renderHTML: ({ HTMLAttributes }) => [
    "p",
    mergeAttributes(HTMLAttributes, { class: "fb2-subtitle" }),
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

          for (let d = $from.depth; d > 0; d--) {
            const name = $from.node(d).type.name;
            if (["fb2Section", "fb2Stanza"].includes(name)) {
              parentNode = $from.node(d);
              parentPos = $from.before(d);
              break;
            }
            if (["fb2Title", "fb2Epigraph", "fb2Subtitle"].includes(name))
              return false;
          }

          if (!parentNode) return false;

          let insertPos = $from.pos;

          // 2. ЛОГИКА ДЛЯ СТРОФЫ (fb2Stanza)
          if (parentNode.type.name === "fb2Stanza") {
            let hasSubtitle = false;
            let titleOffset = 0;

            // Быстро проверяем структуру строфы (в ней мало узлов)
            parentNode.forEach((child, offset) => {
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
          // 1. Ищем, находимся ли мы внутри fb2Subtitle
          const { pos: subtitlPos, nodeSize: subtitleNodeSize } =
            findParentNodeByType(state.selection, ["fb2Subtitle"]);

          // Если не нашли — команда недоступна (кнопка в UI будет неактивна)
          if (subtitlPos === -1) return false;

          // 3. Удаляем узел и возвращаем фокус
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
