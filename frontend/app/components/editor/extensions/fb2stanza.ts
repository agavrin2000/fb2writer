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
        ({ state, chain }: CommandProps) => {
          const { $from } = state.selection;
          let poemNode: any = null;
          let poemPos = -1;

          // 1. Ищем родительский 'poem' вверх по дереву
          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node?.type.name === "fb2Poem") {
              poemNode = node;
              poemPos = $from.before(d);
              break;
            }
          }

          // Если мы не внутри poem — команда недоступна
          if (!poemNode || poemPos === -1) return false;

          // 2. Находим позицию ПОСЛЕ последней строфы внутри этой poem
          let lastStanzaEnd = poemPos + 1; // Начинаем от начала poem
          poemNode.forEach((child: any, offset: number) => {
            if (child.type.name === "fb2Stanza") {
              lastStanzaEnd = poemPos + 1 + offset + child.nodeSize;
            }
          });

          // 3. Вставляем новую строфу в вычисленную позицию
          return chain()
            .insertContentAt(lastStanzaEnd, {
              type: "fb2Stanza",
              content: [
                {
                  type: "fb2V",
                  content: [{ type: "text", text: "Строка..." }],
                },
              ],
            })
            .focus(lastStanzaEnd + 2) // Фокусируемся внутри новой строфы
            .run();
        },
      removeFb2Stanza:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          const { $from } = state.selection;
          let stanzaPos = -1;
          let stanzaNodeSize = 0;
          let parentNode: any = null;

          // 1. Ищем саму строфу и её родителя
          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "fb2Stanza") {
              stanzaPos = $from.before(d);
              stanzaNodeSize = node.nodeSize;
              parentNode = $from.node(d - 1); // Родитель строфы (обычно poem)
              break;
            }
          }

          // Если мы не в строфе — выходим
          if (stanzaPos === -1 || !parentNode) return false;

          // 2. Считаем количество строф у родителя
          let stanzaCount = 0;
          parentNode.forEach((child: any) => {
            if (child.type.name === "fb2Stanza") stanzaCount++;
          });

          // 3. Если строфа последняя — запрещаем удаление (возвращаем false)
          if (stanzaCount <= 1) return false;

          if (dispatch) {
            return chain()
              .deleteRange({ from: stanzaPos, to: stanzaPos + stanzaNodeSize })
              .focus()
              .run();
          }

          return true;
        },
    };
  },
});
