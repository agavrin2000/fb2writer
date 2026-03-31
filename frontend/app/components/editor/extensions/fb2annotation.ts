import { Node, CommandProps } from "@tiptap/core";
import { findParentNodeByType } from "@/utils/utils";
import { Node as ProsemirrorNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";

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
          const { selection } = state;
          let sectionPos = -1;
          let sectionNode = null;

          // 1. Проверяем: выделена ли сама секция?
          if (
            selection instanceof NodeSelection &&
            selection.node.type.name === "fb2Section"
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
                node.type.name === "fb2Section"
              ) {
                sectionPos = $from.before(d);
                sectionNode = node;
                break;
              }
            }
          }

          // Если не нашли секцию или аннотация уже есть — блокируем команду
          if (!sectionNode) return false;

          let hasAnnotation = false;
          let insertOffset = 0; // По умолчанию 0 (в самое начало контента секции)

          for (let i = 0; i < sectionNode.childCount; i++) {
            const child = sectionNode.child(i);
            const type = child.type.name;

            if (type === "fb2Annotation") {
              hasAnnotation = true;
              break; // Аннотация уже есть, дальше искать нет смысла
            }

            // Если встретили "структурный" узел, который должен быть ПЕРЕД аннотацией
            if (
              type === "fb2Title" ||
              type === "fb2Epigraph" ||
              type === "fb2BlockImage"
            ) {
              insertOffset += child.nodeSize;
            } else {
              // Как только встретили любой другой узел (p, poem и т.д.) —
              // значит, блок заголовков закончился. Прерываемся.
              break;
            }
          }

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
              .focus(finalPos + 2) // Фокус на текст внутри аннотации
              .run();
          }

          return true;
        },
      removeFb2Annotation:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          const { selection } = state;
          let nodePos = -1;
          let nodeSize = 0;

          // 1. Если выделена вся секция
          if (
            selection instanceof NodeSelection &&
            selection.node.type.name === "fb2Section"
          ) 
          {
            const section = selection.node;
            let currentOffset = 0;

            // Проверяем только первые узлы (обычно заголовок, эпиграф, аннотация)
            // Прекращаем поиск, если встретили обычный текст (параграф)
            for (let i = 0; i < section.childCount; i++) {
              const child = section.child(i);
              if (child.type.name === "fb2Annotation") {
                nodePos = selection.from + 1 + currentOffset;
                nodeSize = child.nodeSize;
                break;
              }
              // Оптимизация: если дошли до контента, дальше аннотации быть не может
              if (
                child.type.name === "paragraph" ||
                child.type.name === "fb2Section"
              )
                break;

              currentOffset += child.nodeSize;
            }
          }
          // 2. Если курсор уже внутри аннотации
          else {
            const { $from } = selection;
            for (let d = $from.depth; d > 0; d--) {
              const node = $from.node(d);
              if (node.type.name === "fb2Annotation") {
                nodePos = $from.before(d);
                nodeSize = node.nodeSize;
                break;
              }
            }
          }

          if (nodePos === -1) return false;

          if (dispatch) {
            return chain()
              .deleteRange({ from: nodePos, to: nodePos + nodeSize })
              .focus()
              .run();
          }
          return true;
        },
    };
  },
});