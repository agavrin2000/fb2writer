import { Node, mergeAttributes, CommandProps } from "@tiptap/core";
import { findParentNodeByType } from "@/utils/utils";
import { Node as ProsemirrorNode } from "@tiptap/pm/model";

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
          // 1. Ищем родительскую секцию (автоматически обрабатывает и NodeSelection, и курсор)
          const found = findParentNodeByType(state.selection, [
            "fb2Section",
            "fb2BodySection",
            "fb2Poem",
          ]);
          if (!found) return false;

          const { node: section, pos: sectionPos } = found;

          // 2. Определяем позицию вставки: после последнего заголовка или эпиграфа
          let insertOffset = 0;
          section.forEach((child: ProsemirrorNode, offset: number) => {
            if (["fb2Title", "fb2Epigraph"].includes(child.type.name)) {
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
              .focus(finalPos + 2) // Фокус внутри параграфа нового эпиграфа
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
