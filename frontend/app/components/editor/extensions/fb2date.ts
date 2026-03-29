import { Node, mergeAttributes, CommandProps } from "@tiptap/core";
import { findParentNodeByType } from "@/utils/utils";

export const Fb2Date = Node.create({
  name: "fb2Date",
  group: "block",
  content: "inline*",
  marks: "",
  defining: true,
  selectable: true,
  addAttributes() {
    return {
      value: {
        default: new Date().toISOString().split("T")[0],
        parseHTML: (element) => element.getAttribute("value"),
        renderHTML: (attributes) => ({ value: attributes.value }),
      },
    };
  },
  parseHTML: () => [{ tag: "date" }, { tag: "p.fb2-date" }],
  renderHTML: ({ HTMLAttributes }) => [
    "date",
    mergeAttributes(HTMLAttributes, { class: "fb2-date" }),
    0,
  ],

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement("span");
      dom.classList.add("fb2-date", "fb2-date-container");

      const contentDOM = document.createElement("span");
      contentDOM.classList.add("fb2-date-text");

      // 1. Хелпер для форматирования в YYYY-MM-DD
      const formatDate = (val: string) => {
        const date = new Date(val);
        // Проверка на валидность даты, чтобы не упасть в ошибку
        return isNaN(date.getTime())
          ? "0000-00-00"
          : date.toISOString().split("T")[0];
      };

      const dateBadge = document.createElement("span");
      dateBadge.classList.add("fb2-date-badge");
      dateBadge.contentEditable = "false";
      // Устанавливаем текст в формате YYYY-MM-DD
      dateBadge.innerText = formatDate(node.attrs.value);

      const controls = document.createElement("span");
      controls.classList.add("fb2-date-controls");
      controls.contentEditable = "false";

      const button = document.createElement("button");
      button.innerHTML = "📅";
      button.title = `ISO: ${node.attrs.value}`;

      const input = document.createElement("input");
      input.type = "date";
      input.value = node.attrs.value;

      input.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (typeof getPos === "function") {
          editor.commands.updateAttributes("fb2Date", { value: target.value });
        }
      };

      controls.append(button, input);
      dom.append(contentDOM, dateBadge, controls);

      return {
        dom,
        contentDOM,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) return false;

          // 2. Обновляем текст в badge в формате YYYY-MM-DD
          const newDateText = formatDate(updatedNode.attrs.value);
          if (dateBadge.innerText !== newDateText) {
            dateBadge.innerText = newDateText;
          }

          input.value = updatedNode.attrs.value;
          button.title = `ISO: ${updatedNode.attrs.value}`;

          return true;
        },
      };
    };
  },

  addCommands(): any {
    return {
      insertFb2Date:
        () =>
        ({ chain, state, dispatch }: CommandProps) => {
          // 1. Ищем родительскую поэму (автоматически проверяет и NodeSelection, и курсор внутри)
          const foundPoem = findParentNodeByType(state.selection, ["fb2Poem"]);
          if (!foundPoem || !foundPoem.node) return false;

          const { node: poem, pos: poemPos } = foundPoem;

          // 2. Проверяем, нет ли уже даты в конце
          if (poem.lastChild?.type.name === "fb2Date") return false;

          if (dispatch) {
            // Позиция вставки: позиция поэмы + размер всей ноды - 1 (закрывающий тег)
            const insertPos = poemPos + poem.nodeSize - 1;

            return chain()
              .insertContentAt(insertPos, {
                type: "fb2Date",
                content: [
                  {
                    type: "text",
                    text: new Date().toISOString().split("T")[0],
                  },
                ],
              })
              .focus(insertPos + 1)
              .run();
          }
          return true;
        },

      removeFb2Date:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          // 1. Ищем саму дату (под курсором)
          let target = findParentNodeByType(state.selection, ["fb2Date"]);

          // 2. Если не нашли под курсором, проверяем: вдруг выделена вся поэма?
          if (!target) {
            const foundPoem = findParentNodeByType(state.selection, [
              "fb2Poem",
            ]);
            if (foundPoem?.node.lastChild?.type.name === "fb2Date") {
              const lastChild = foundPoem.node.lastChild;
              // Смещение: позиция родителя + позиция последнего ребенка внутри родителя
              // (В ProseMirror content.size - lastChild.nodeSize дает смещение начала последнего ребенка)
              const offset =
                foundPoem.node.content.size - lastChild.nodeSize + 1;

              target = {
                node: lastChild,
                pos: foundPoem.pos + offset,
                nodeSize: lastChild.nodeSize, // Добавляем
                depth: foundPoem.depth + 1, // Добавляем (приблизительно)
              };
            }
          }

          if (!target) return false;

          if (dispatch) {
            return chain()
              .deleteRange({
                from: target.pos,
                to: target.pos + target.node.nodeSize,
              })
              .focus()
              .run();
          }
          return true;
        },
    };
  },
});
