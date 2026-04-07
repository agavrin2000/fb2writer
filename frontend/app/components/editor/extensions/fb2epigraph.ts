import { Node, mergeAttributes, CommandProps } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { findParentNodeByType } from "@/utils/utils";
import { Node as ProsemirrorNode } from "@tiptap/pm/model";

const TARGET_TYPES = ["fb2Section", "fb2BodySection", "fb2Poem"];

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
      class: "fb2-epigraph",
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
  addCommands(): any {
    return {
      insertFb2Epigraph:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          const { selection } = state;
          let sectionPos = -1;
          let sectionNode = null;

          // 1. Проверяем: выделена ли сама секция?
          if (
            selection instanceof NodeSelection &&
            TARGET_TYPES.includes(selection.node.type.name)
          ) {
            sectionPos = selection.from;
            sectionNode = selection.node;
          }
          // 2. Если нет — ищем родительскую секцию вверх по дереву
          else {
            ({ node: sectionNode, pos: sectionPos } = findParentNodeByType(
              selection,
              TARGET_TYPES,
            ));
          }

          // 1. Ищем родительскую секцию (автоматически обрабатывает и NodeSelection, и курсор)
          if (sectionPos === -1) return false;

          // 2. Определяем позицию вставки: после последнего заголовка или эпиграфа
          let insertOffset = 0;
          sectionNode.forEach((child: ProsemirrorNode, offset: number) => {
            if (["fb2Title", "fb2Epigraph"].includes(child.type.name)) {
              insertOffset = offset + child.nodeSize;
            }
          });

          if (dispatch) {
            const insertPos = sectionPos + 1 + insertOffset;
            return chain()
              .insertContentAt(insertPos, {
                type: "fb2Epigraph",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Эпиграф" }],
                  },
                  {
                    type: "fb2TextAuthor",
                    content: [{ type: "text", text: "Автор текста" }],
                  },
                ],
              })
              .focus(insertPos + 2) // Фокус внутри параграфа нового эпиграфа
              .run();
          }
          return true;
        },
      removeFb2Epigraph:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          const { pos: epigraphPos, nodeSize: epigraphNodeSize } =
            findParentNodeByType(state.selection, ["fb2Epigraph"]);
          if (epigraphPos === -1) return false;

          if (dispatch) {
            return chain()
              .deleteRange({
                from: epigraphPos,
                to: epigraphPos + epigraphNodeSize,
              })
              .focus(epigraphPos - 1)
              .run();
          }
          return true;
        },
    };
  },
});
