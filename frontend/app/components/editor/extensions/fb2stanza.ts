import { Node, mergeAttributes } from "@tiptap/core";
import { CommandProps } from "@tiptap/core";
import { findParentNodeByType } from "@/utils/utils";

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
          let poemNode = null;
          let poemPos = -1;

          // 1. Ищем родительский 'poem' вверх по дереву
          ({ pos: poemPos, node: poemNode } = findParentNodeByType(
            state.selection,
            ["fb2Poem"],
          ));

          // Если мы не внутри poem — команда недоступна
          if (poemPos === -1 || poemNode == null) return false;

          // 2. Находим позицию ПОСЛЕ последней строфы внутри этой poem
          let lastStanzaEnd = poemPos + 1; // Начинаем от начала poem
          poemNode.forEach((child, offset) => {
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
          let stanzaPos = -1;
          let stanzaNodeSize = 0;
          let stanzaNode = null;
          let stanzaDepth: number | null = null;

          // 1. Ищем саму строфу и её родителя
          ({
            pos: stanzaPos,
            node: stanzaNode,
            nodeSize : stanzaNodeSize,
            depth: stanzaDepth,
          } = findParentNodeByType(state.selection, ["fb2Stanza"]));

          // Если мы не в строфе — выходим
          if (stanzaPos === -1 || stanzaNode==null || stanzaDepth==null) return false;

          // 2. Получаем родительский узел (он находится на один уровень выше)
          // depth - 1 даст нам родителя строфы (обычно это fb2Poem)
          const poemNode = state.selection.$from.node(stanzaDepth); 

          // 2. Считаем количество строф у родителя
          let stanzaCount = 0;
          poemNode.forEach((child) => {
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
