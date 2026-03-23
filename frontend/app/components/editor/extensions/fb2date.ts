import { Node, mergeAttributes } from "@tiptap/core";
import { CommandProps } from "@tiptap/core";

export const Fb2Date = Node.create({
  name: "fb2Date",
  group: "block",
  content: "inline*",
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
      dom.classList.add("fb2-date-container");

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
        ({ chain, state }: any) => {
          const { $from } = state.selection;
          let poemNode: any = null;
          let poemPos = -1;

          // 1. Ищем родительский узел 'poem' вверх по дереву
          for (let d = $from.depth; d > 0; d--) {
            if (state.doc.nodeAt($from.before(d))?.type.name === "poem") {
              poemNode = state.doc.nodeAt($from.before(d));
              poemPos = $from.before(d);
              break;
            }
          }

          // Если мы не в poem — ничего не делаем
          if (!poemNode) return false;

          // 2. Проверяем, есть ли уже дата внутри этой poem
          let hasDate = false;
          poemNode.forEach((child: any) => {
            if (child.type.name === this.name) hasDate = true;
          });

          if (hasDate) return false;

          // 3. Вычисляем позицию вставки (конец poem)
          // poemPos + 1 (начало) + размер контента
          const insertPos = poemPos + poemNode.nodeSize - 1;

          return chain()
            .insertContentAt(insertPos, {
              type: this.name,
              // Сразу ставим текст в нужном формате YYYY-MM-DD, как договаривались
              content: [
                {
                  type: "text",
                  text: new Date().toISOString().split("T")[0],
                },
              ],
            })
            .focus(insertPos + 1) // Фокусируемся на тексте новой даты
            .run();
        },

      removeFb2Date:
        () =>
        ({ state, commands }: any) => {
          const { $from } = state.selection;

          // Ищем, есть ли среди родительских узлов узел с типом fb2Date
          const isInsideFb2Date =
            $from.after($from.depth) &&
            state.doc.nodeAt($from.before($from.depth))?.type.name ===
              "fb2Date";

          // Если мы внутри fb2Date, выделяем весь узел и удаляем его
          if (isInsideFb2Date) {
            return commands.deleteSelection();
          }

          return false; // Если курсор не в дате, команда ничего не делает
        },
    };
  },
});
