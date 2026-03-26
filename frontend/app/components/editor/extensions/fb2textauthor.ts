import { Node, mergeAttributes } from "@tiptap/core";
import { CommandProps } from "@tiptap/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { findParentNodeByType } from "@/utils/utils";

export const Fb2TextAuthor = Node.create({
  name: "fb2TextAuthor",
  group: "block",
  content: "inline*",
  defining: true, // Важно: сохраняет узел при вставке контента или нажатии Enter
  selectable: true,
  parseHTML: () => [{ tag: "p.text-author" }, { tag: "text-author" }],
  renderHTML: ({ HTMLAttributes }) => [
    "p",
    mergeAttributes(HTMLAttributes, { class: "fb2-text-author" }),
    0,
  ],
  addCommands(): any {
    return {
      insertFb2TextAuthor:
        () =>
        ({ state, chain }: any) => {
          const { selection } = state;
          let parentNode: any = null;
          let parentPos = -1;

          // 1. Проверяем: выделена ли сама секция?
          if (
            selection instanceof NodeSelection &&
            selection.node.type.name === "fb2Poem"
          ) {
            parentPos = selection.from;
            parentNode = selection.node;
          }
          // 2. Если нет — ищем родительскую секцию вверх по дереву
          else {
            ({ node: parentNode, pos: parentPos } = findParentNodeByType(
              selection,
              ["fb2Poem", "fb2Epigraph", "fb2Cite"],
            ));
          }

          if (!parentNode) return false;

          // Начальная точка вставки (сразу после открытия тега родителя)
          let insertPos = parentPos + 1;

          if (parentNode.type.name === "fb2Poem") {
            // 2. В Poem ищем конец последней Stanza ИЛИ последнего TextAuthor
            parentNode.forEach((child: any, offset: number) => {
              if (
                child.type.name === "fb2Stanza" ||
                child.type.name === "fb2TextAuthor"
              ) {
                insertPos = parentPos + 1 + offset + child.nodeSize;
              }
            });
          } else {
            // 3. В Epigraph/Cite ищем конец последнего TextAuthor
            // Если авторов нет, вставим в самый конец блока
            let lastAuthorEnd = -1;
            parentNode.forEach((child: any, offset: number) => {
              if (child.type.name === "fb2TextAuthor") {
                lastAuthorEnd = parentPos + 1 + offset + child.nodeSize;
              }
            });

            if (lastAuthorEnd !== -1) {
              insertPos = lastAuthorEnd;
            } else {
              // Если авторов еще нет, ставим в конец перед закрывающим тегом
              insertPos = parentPos + parentNode.nodeSize - 1;
            }
          }

          return chain()
            .insertContentAt(insertPos, {
              type: "fb2TextAuthor",
              content: [{ type: "text", text: "Автор текста" }],
            })
            .focus(insertPos + 1)
            .run();
        },

      removeFb2TextAuthor:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          const { selection } = state;

          const { nodeSize: textAuthorNodeSize, pos: textAuthorPos } =
            findParentNodeByType(selection, ["fb2TextAuthor"]);

          if (textAuthorPos === -1) return false;

          if (dispatch) {
            const focusPos = textAuthorPos - 1;
            return chain()
              .deleteRange({
                from: textAuthorPos,
                to: textAuthorPos + textAuthorNodeSize,
              })
              .focus(focusPos)
              .run();
          }
          return true;
        },
    };
  },
});
