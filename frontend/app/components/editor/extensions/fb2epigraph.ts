import { Node, mergeAttributes } from "@tiptap/core";
import { CommandProps } from "@tiptap/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { findParentNodeByType } from "@/utils/utils";

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
            ["fb2Section", "fb2BodySection", "fb2Poem"].includes(
              selection.node.type.name,
            )
          ) {
            sectionPos = selection.from;
            sectionNode = selection.node;
          }
          // 2. Если нет — ищем родительскую секцию вверх по дереву
          else {
            ({ node: sectionNode, pos: sectionPos } = findParentNodeByType(
              selection,
              ["fb2Section", "fb2BodySection", "fb2Poem"],
            ));
          }

          if (!sectionNode) return false;

          // 2. Определяем позицию вставки
          // Эпиграф должен идти ПОСЛЕ заголовка и ПОСЛЕ уже существующих эпиграфов
          let insertOffset = 0;

          sectionNode.forEach((child, offset) => {
            if (
              child.type.name === "fb2Title" ||
              child.type.name === "fb2Epigraph"
            ) {
              insertOffset = offset + child.nodeSize;
            }
          });

          if (dispatch) {
            const finalPos = sectionPos + 1 + insertOffset;
            return chain()
              .insertContentAt(finalPos, {
                type: "fb2Epigraph",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Эпиграф" }],
                  },
                ],
              })
              .focus(finalPos + 2) // Ставим курсор в новый эпиграф
              .run();
          }
          return true;
        },
      removeFb2Epigraph:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          const { pos: epigraphPos, nodeSize: epigraphNodeSize } = findParentNodeByType(state.selection, ["fb2Epigraph"]);

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
