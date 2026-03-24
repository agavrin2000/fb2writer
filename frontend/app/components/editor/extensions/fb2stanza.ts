import { Node, mergeAttributes } from "@tiptap/core";
import { CommandProps } from "@tiptap/core";

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
          const { $from } = state.selection;

          // 1. Быстрый поиск текущей строфы (макс. 2 уровня вверх: строка -> строфа)
          let stanzaDepth = -1;
          for (let d = $from.depth; d > Math.max(0, $from.depth - 2); d--) {
            if ($from.node(d).type.name === "fb2Stanza") {
              stanzaDepth = d;
              break;
            }
          }

          // Если мы не в строфе (и значит не в poem), вставка запрещена
          if (stanzaDepth === -1) return false;

          if (dispatch) {
            // 2. Вычисляем позицию СРАЗУ ПОСЛЕ текущей строфы
            const insertPos = $from.after(stanzaDepth);

            return chain()
              .insertContentAt(insertPos, {
                type: "fb2Stanza",
                content: [
                  {
                    type: "fb2V",
                    content: [{ type: "text", text: "" }], // Пустая строка лучше, чем "Строка..."
                  },
                ],
              })
              .focus(insertPos + 2) // +1 (stanza) +1 (v) = внутри текстового поля
              .run();
          }

          return true;
        },
      removeFb2Stanza:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          const { $from } = state.selection;

          // Оптимизация 1: Ищем строфу только на ближайших 3 уровнях (строка -> строфа -> поэма)
          // Метод findParentNode ищет вверх по дереву только до указанной глубины
          let stanzaDepth = -1;
          for (let d = $from.depth; d > Math.max(0, $from.depth - 3); d--) {
            if ($from.node(d).type.name === "fb2Stanza") {
              stanzaDepth = d;
              break;
            }
          }

          if (stanzaDepth === -1) return false;

          const stanzaNode = $from.node(stanzaDepth);
          const parentNode = $from.node(stanzaDepth - 1); // Обычно это fb2Poem

          if (!parentNode) return false;

          // Оптимизация 2: Считаем строфы через childCount (быстрее, чем forEach по всему документу)
          let stanzaCount = 0;
          for (let i = 0; i < parentNode.childCount; i++) {
            if (parentNode.child(i).type.name === "fb2Stanza") stanzaCount++;
          }

          if (stanzaCount <= 1) return false;

          if (dispatch) {
            const stanzaPos = $from.before(stanzaDepth);
            return chain()
              .deleteRange({
                from: stanzaPos,
                to: stanzaPos + stanzaNode.nodeSize,
              })
              .focus()
              .run();
          }

          return true;
        },
    };
  },
});
