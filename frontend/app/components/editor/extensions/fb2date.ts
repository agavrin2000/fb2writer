import { Node, mergeAttributes } from "@tiptap/core";
import { CommandProps } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";

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
        ({ chain, state, dispatch }: any) => {
          const { selection } = state;
          let poemPos = -1;
          let poemNode = null;

          // 1. Проверяем: выделена ли сама секция?
          if (
            selection instanceof NodeSelection &&
            selection.node.type.name === "fb2Poem"
          ) {
            poemPos = selection.from;
            poemNode = selection.node;
          }
          // 2. Если нет — ищем родительскую секцию вверх по дереву
          else {
            const { $from } = selection;
            for (let d = $from.depth; d > 0; d--) {
              const node = $from.node(d);
              if (node.type.name === "fb2Poem") {
                poemPos = $from.before(d);
                poemNode = node;
                break;
              }
            }
          }

          // Если не нашли секцию или заголовок уже есть — блокируем команду
          if (!poemNode) return false;

          const lastChild = poemNode.lastChild;
          const hasDate = lastChild?.type.name === "fb2Date";

          if (hasDate) return false;

          // 3. Вычисляем позицию вставки (конец poem)
          // poemPos + 1 (начало) + размер контента
          if (dispatch) {
            const insertPos = poemPos + poemNode.nodeSize - 1;

            return chain()
              .insertContentAt(insertPos, {
                type: this.name,
                content: [
                  {
                    type: "text",
                    text: new Date().toISOString().split("T")[0],
                  },
                ],
              })
              .focus(insertPos + 1) // Фокусируемся на тексте новой даты
              .run();
          }
          return true;
        },
      removeFb2Date:
        () =>
        ({ state, dispatch, chain }: CommandProps) => {
          const { selection } = state;

          let datePos = -1;
          let dateNodeSize = 0;
          // 1. Если выделена вся нода (fb2Poem)
          if (
            selection instanceof NodeSelection &&
            selection.node.type.name === "fb2Poem"
          ) {
            selection.node.forEach((child, offset) => {
              if (child.type.name === "fb2Date") {
                datePos = selection.from + 1 + offset;
                dateNodeSize = child.nodeSize;
              }
            });
          }
          // 2. Если курсор внутри (обычное выделение)
          else {
            const { $from } = selection;
            for (let d = $from.depth; d > 0; d--) {
              const node = $from.node(d);
              if (node.type.name === "fb2Date") {
                datePos = $from.before(d);
                dateNodeSize = node.nodeSize;
                break;
              }
            }
          }

          if (datePos === -1) return false;

          if (dispatch) {
            return chain()
              .deleteRange({ from: datePos, to: datePos + dateNodeSize })
              .focus()
              .run();
          }
          return true;
        },
    };
  },
});
