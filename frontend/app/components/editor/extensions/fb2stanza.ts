import { Node, mergeAttributes } from "@tiptap/core";
import { CommandProps } from "@tiptap/core";
import { findParentNodeByType } from "@/utils/utils";
import { Node as ProsemirrorNode } from "@tiptap/pm/model";

export const Fb2Stanza = Node.create({
  name: "fb2Stanza",
  group: "block",
  content: "fb2Title? fb2Subtitle? fb2V+",
  defining: true, // Важно: сохраняет узел при вставке контента или нажатии Enter
  isolating: true,
  selectable: true,
  parseHTML: () => [{ tag: "div.fb2-stanza" }, { tag: "stanza" }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, {
      class: "fb2-stanza",
    }),
    0,
  ],
  addCommands() {
    return {
      insertFb2Stanza:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          // 1. Ищем текущую строфу (автоматически проверяет все уровни вверх)
          const found = findParentNodeByType(state.selection, ["fb2Stanza"]);
          if (!found) return false;

          if (dispatch) {
            // Позиция СРАЗУ ПОСЛЕ текущей строфы
            const insertPos = found.pos + found.node.nodeSize;

            return chain()
              .insertContentAt(insertPos, {
                type: "fb2Stanza",
                content: [
                  {
                    type: "fb2V",
                    content: [{ type: "text", text: "" }],
                  },
                ],
              })
              .focus(insertPos + 2) // Входим внутрь новой строфы и новой строки
              .run();
          }
          return true;
        },

      removeFb2Stanza:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          // 1. Ищем текущую строфу
          const foundStanza = findParentNodeByType(state.selection, [
            "fb2Stanza",
          ]);
          if (!foundStanza) return false;

          // 2. Ищем родительскую поэму, чтобы проверить количество строф
          const foundPoem = findParentNodeByType(state.selection, ["fb2Poem"]);
          if (!foundPoem || !foundPoem.node) return false;

          // Считаем только детей типа fb2Stanza (используем childCount и фильтр для скорости)
          let stanzaCount = 0;
          foundPoem.node.content?.forEach((child: ProsemirrorNode) => {
            if (child.type.name === "fb2Stanza") stanzaCount++;
          });

          // Запрещаем удаление, если это единственная строфа в поэме
          if (stanzaCount <= 1) return false;

          if (dispatch) {
            return chain()
              .deleteRange({
                from: foundStanza.pos,
                to: foundStanza.pos + foundStanza.node.nodeSize,
              })
              .focus()
              .run();
          }
          return true;
        },
    };
  },
});
