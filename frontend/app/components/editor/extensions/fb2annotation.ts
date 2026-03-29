import { Node, CommandProps } from "@tiptap/core";
import { findParentNodeByType } from "@/utils/utils";
import { Node as ProsemirrorNode } from "@tiptap/pm/model";

export const Fb2Annotation = Node.create({
  name: "fb2Annotation",
  group: "block",
  content: "(paragraph | fb2Poem | fb2Subtitle | fb2Cite)+",
  parseHTML: () => [{ tag: "annotation" }],
  renderHTML: () => ["cite", { class: "fb2-annotation" }, 0],
  addCommands(): any {
    return {
      insertFb2Annotation:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          // 1. Ищем подходящую секцию (автоматически для NodeSelection и курсора)
          const found = findParentNodeByType(state.selection, [
            "fb2Section",
            "fb2BodySection",
          ]);
          if (!found) return false;

          const { node: section, pos: sectionPos } = found;

          // 2. Ищем позицию для вставки и проверяем на дубликат
          let insertOffset = 0;
          let hasAnnotation = false;

          section.forEach((child: ProsemirrorNode, offset: number) => {
            if (hasAnnotation) return; // Если уже нашли, прерываем логику

            if (child.type.name === "fb2Annotation") {
              hasAnnotation = true;
            } else if (
              ["fb2Title", "fb2Epigraph", "fb2BlockImage"].includes(
                child.type.name,
              )
            ) {
              // Эти узлы должны идти ПЕРЕД аннотацией
              insertOffset = offset + child.nodeSize;
            }
          });

          if (hasAnnotation) return false;

          if (dispatch) {
            const finalPos = sectionPos + 1 + insertOffset;
            return chain()
              .insertContentAt(finalPos, {
                type: "fb2Annotation",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Текст аннотации..." }],
                  },
                ],
              })
              .focus(finalPos + 2)
              .run();
          }
          return true;
        },

      removeFb2Annotation:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          // 1. Пытаемся найти аннотацию напрямую под курсором
          let target = findParentNodeByType(state.selection, ["fb2Annotation"]);

          // 2. Если курсор не в аннотации, проверяем, не выделена ли секция, содержащая её
          if (!target) {
            const foundSection = findParentNodeByType(state.selection, [
              "fb2Section",
              "fb2BodySection",
            ]);
            if (foundSection) {
              foundSection.node.forEach(
                (child: ProsemirrorNode, offset: number) => {
                  if (child.type.name === "fb2Annotation") {
                    target = {
                      node: child,
                      pos: foundSection.pos + 1 + offset,
                      nodeSize: child.nodeSize,
                      depth: foundSection.depth + 1,
                    };
                  }
                },
              );
            }
          }

          if (!target) return false;

          if (dispatch) {
            return chain()
              .deleteRange({
                from: target.pos,
                to: target.pos + target.nodeSize,
              })
              .focus()
              .run();
          }
          return true;
        },
    };
  },
});
