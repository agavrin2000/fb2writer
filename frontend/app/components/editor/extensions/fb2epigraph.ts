import { Node, mergeAttributes } from "@tiptap/core";
import { CommandProps } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";

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

          // 1. Находим секцию (через выделение или по родителям)
          if (
            selection instanceof NodeSelection &&
            selection.node.type.name === "fb2Section"
          ) {
            sectionPos = selection.from;
            sectionNode = selection.node;
          } else {
            const { $from } = selection;
            for (let d = $from.depth; d > 0; d--) {
              if ($from.node(d).type.name === "fb2Section") {
                sectionPos = $from.before(d);
                sectionNode = $from.node(d);
                break;
              }
            }
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
          const { $from } = state.selection;
          let textEpigraphPos = -1;
          let textEpigraphNodeSize = 0;

          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "fb2Epigraph") {
              textEpigraphPos = $from.before(d);
              textEpigraphNodeSize = node.nodeSize;
              break;
            }
          }

          if (textEpigraphPos === -1) return false;

          if (dispatch) {
            const focusPos = textEpigraphPos - 1;
            return chain()
              .deleteRange({
                from: textEpigraphPos,
                to: textEpigraphPos + textEpigraphNodeSize,
              })
              .focus(focusPos)
              .run();
          }
          return true;
        },
    };
  },
});
