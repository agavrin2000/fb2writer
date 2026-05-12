import { findParentNodeByType } from "../../../utils/utils";
import { Node, CommandProps } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";

export const Fb2Section = Node.create({
  name: "fb2Section",
  group: "block",
  content:
    "fb2Title? fb2Epigraph* fb2BlockImage? fb2Annotation? (block | fb2Section | table)+",
  defining: true,
  selectable: true,
  isolating: true,
  addAttributes() {
    return {
      level: { default: 2 },
      sectionId: {
        default: null,
        // Убираем здесь renderHTML, чтобы Tiptap не вешал id на внешний div
        parseHTML: (element) => element.getAttribute("id"),
      },
      elementId: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("elementid") ||
          element.getAttribute("elementId"),
        renderHTML: (attributes) => {
          if (!attributes.elementId) return {};
          return { elementId: attributes.elementId };
        },
      },
    };
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement("div");
      dom.className = "section-node-wrapper";

      const content = document.createElement("section");
      content.className = "fb2-section";

      // 1. Функция для синхронизации атрибутов с DOM
      const syncAttributes = (newNode: typeof node) => {
        if (newNode.attrs.sectionId) {
          content.id = newNode.attrs.sectionId;
        } else {
          content.removeAttribute("id");
        }

        if (newNode.attrs.elementId) {
          content.setAttribute("elementId", newNode.attrs.elementId);
        } else {
          content.removeAttribute("elementId");
        }
      };

      // Инициализация при создании
      syncAttributes(node);

      const handle = document.createElement("div");
      handle.className = "section-handle";
      handle.innerText = "⠿";
      handle.contentEditable = "false";

      handle.onclick = () => {
        const pos = getPos();
        if (typeof pos === "number") {
          editor.commands.setNodeSelection(pos);
        }
      };

      dom.append(handle, content);

      return {
        dom,
        contentDOM: content,
        // 2. КЛЮЧЕВОЙ МЕТОД: вызывается Tiptap при обновлении атрибутов
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) return false;

          // Синхронизируем атрибуты без перерисовки всего узла
          syncAttributes(updatedNode);
          return true;
        },
        destroy: () => {
          // Очистка event listeners или внешних ссылок
          handle.onclick = null;
        },
      };
    };
  },
  addCommands() {
    return {
      removeFb2Section:
        () =>
        ({ state, chain }: CommandProps) => {
          const { selection, schema } = state;

          // 1. Проверяем: выделена ли сама секция?
          if (
            !(
              selection instanceof NodeSelection &&
              selection.node.type.name === "fb2Section"
            )
          )
            return false;

          const { node: sectionNode } = findParentNodeByType(selection, [
            "fb2Section",
            "fb2BodySection",
          ]);
          if (!sectionNode) return false;

          if (sectionNode.type.name === "fb2BodySection") {
            // Считаем количество секций у родителя
            let sectionCount = 0;
            sectionNode.forEach((child) => {
              if (child.type.name === "fb2Section") sectionCount++;
            });
            // Удаляем секцию
            if (sectionCount <= 1) return false;
            return chain().deleteSelection().run();
          }

          // Для fb2Section заменяем удаленную секцию на пустой параграф
          return chain()
            .insertContent(schema.nodes.paragraph.create())
            .focus()
            .scrollIntoView() // Опционально: прокрутить к новому параграфу
            .run();
        },
    };
  },
});
