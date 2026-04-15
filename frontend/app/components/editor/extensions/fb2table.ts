import { CommandProps, mergeAttributes } from "@tiptap/core";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { Attributes } from "@tiptap/core";

// 1. Расширяем типы Tiptap, чтобы он знал о наших новых командах
// 1. ПРАВИЛЬНОЕ расширение типов
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fb2TableCommands: { // Произвольное уникальное имя группы
      setCellAlign: (alignment: 'left' | 'center' | 'right' | 'justify') => ReturnType;
      setCellVAlign: (valignment: 'top' | 'middle' | 'bottom') => ReturnType;
    }
  }
}
// 1. Сама таблица
export const Fb2Table = Table.extend({
  name: "fb2Table",
  // Разрешаем ячейкам быть в любом порядке
  content: "fb2TableRow+",
  parseHTML() {
    return [{ tag: "table" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "table",
      mergeAttributes(HTMLAttributes, { class: "fb2-table" }),
      ["tbody", 0],
    ];
  },
  addAttributes() {
    return {
      // Добавляем атрибут id
      id: {
        default: null,
        // Отрисовка в HTML: добавляем атрибут id к тегу <p>
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {};
          }
          return { id: attributes.id };
        },
        // Парсинг из HTML: ищем атрибут id в теге <p>
        parseHTML: (element) => element.getAttribute("id"),
      },
    };
  },
});

// 2. Строка таблицы
export const Fb2TableRow = TableRow.extend({
  name: "fb2TableRow",
  content: "(fb2Th| fb2Td)*",
  parseHTML() {
    return [{ tag: "tr" }];
  },
  addAttributes() {
    return {
      // Добавляем атрибут id
      align: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("align"),
        renderHTML: (attr: Attributes) =>
          attr.align ? { align: attr.align as string } : {},
      },
    };
  },
  addCommands() {
    return {
      setCellAlign:
        (alignment: "left" | "center" | "right" | "justify") =>
        ({ tr, state, dispatch }: CommandProps) => {
          const { selection } = state;
          // Мы используем внутреннюю логику расширения table для обновления атрибутов
          // Если dispatch существует, обновляем атрибут у всех выбранных ячеек
          if (dispatch) {
            tr.setSelection(selection);
            const { from, to } = selection;
            state.doc.nodesBetween(from, to, (node, pos) => {
              if (node.type.name === this.name || node.type.name === "fb2Th") {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  align: alignment,
                });
              }
            });
          }
          return true;
        },

      setCellVAlign:
        (valignment: "top" | "middle" | "bottom") =>
        ({ tr, state, dispatch }: CommandProps) => {
          if (dispatch) {
            const { selection } = state;
            const { from, to } = selection;
            state.doc.nodesBetween(from, to, (node, pos) => {
              if (node.type.name === this.name || node.type.name === "fb2Th") {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  valign: valignment,
                });
              }
            });
          }
          return true;
        },
    };
  },
});

// Общая логика для атрибутов ячеек, чтобы не дублировать код
const commonAttributes = {
  align: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute("align"),
    renderHTML: (attr: Attributes) =>
      attr.align ? { align: attr.align as string } : {},
  },
  valign: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute("valign"),
    renderHTML: (attr: Attributes) =>
      attr.valign ? { valign: attr.valign as string } : {},
  },
  colspan: {
    default: null,
    parseHTML: (el: HTMLElement) => {
      const val = el.getAttribute("colspan");
      return val ? parseInt(val, 10) : null;
    },
    renderHTML: (attr: Attributes) =>
      attr.colspan && Number(attr.colspan) > 1
        ? { colspan: attr.colspan as number }
        : {},
  },
  rowspan: {
    default: null,
    parseHTML: (el: HTMLElement) => {
      const val = el.getAttribute("rowspan");
      return val ? parseInt(val, 10) : null;
    },
    renderHTML: (attr: Attributes) =>
      attr.rowspan && Number(attr.rowspan) > 1
        ? { rowspan: attr.rowspan as number }
        : {},
  },
  id: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute("id"),
    renderHTML: (attr: Attributes) =>
      attr.id ? { id: attr.id as string } : {},
  },
  style: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute("style"),
    renderHTML: (attr: Attributes) =>
      attr.style ? { style: attr.style as string } : {},
  },
};

export const Fb2Td = TableCell.extend({
  name: "fb2Td",
  content: "inline*",
  addAttributes() {
    return commonAttributes;
  },
  renderHTML({ HTMLAttributes }) {
    return ["td", mergeAttributes(HTMLAttributes), 0];
  },
});

export const Fb2Th = TableHeader.extend({
  name: "fb2Th",
  content: "inline*",
  addAttributes() {
    return commonAttributes;
  },
  renderHTML({ HTMLAttributes }) {
    return ["th", mergeAttributes(HTMLAttributes), 0];
  },
});
