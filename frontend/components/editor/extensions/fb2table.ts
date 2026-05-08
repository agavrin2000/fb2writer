import { mergeAttributes, Attributes } from "@tiptap/core";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fb2TableCommands: {
      setCellAlign: (
        alignment: "left" | "center" | "right" | "justify",
      ) => ReturnType;
      setCellVAlign: (valignment: "top" | "middle" | "bottom") => ReturnType;
    };
  }
}

const commonAttributes = {
  align: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute("align"),
    renderHTML: (attr: Attributes) => (attr.align ? { align: attr.align } : {}),
  },
  valign: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute("valign"),
    renderHTML: (attr: Attributes) =>
      attr.valign ? { valign: attr.valign } : {},
  },
  id: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute("id"),
    renderHTML: (attr: Attributes) => (attr.id ? { id: attr.id } : {}),
  },
  // Добавляем поддержку объединения
  colspan: {
    default: 1,
    parseHTML: (el: HTMLElement) =>
      parseInt(el.getAttribute("colspan") || "1", 10),
    renderHTML: (attr: Attributes) => {
      const colspan = Number(attr.colspan);
      return colspan > 1 ? { colspan } : {};
    },
  },
  rowspan: {
    default: 1,
    parseHTML: (el: HTMLElement) =>
      parseInt(el.getAttribute("rowspan") || "1", 10),
    renderHTML: (attr: Attributes) => {
      const rowspan = Number(attr.rowspan);
      return rowspan > 1 ? { rowspan } : {};
    },
  },
};

// Ячейка данных
export const Fb2Td = TableCell.extend({
  name: "fb2Td",
  content: "inline*",
  addAttributes() {
    return {
      ...this.parent?.(), // Наследуем базовые атрибуты (важно для работы плагина таблиц)
      ...commonAttributes,
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ["td", mergeAttributes(HTMLAttributes), 0];
  },
});

// Ячейка заголовка
export const Fb2Th = TableHeader.extend({
  name: "fb2Th",
  content: "inline*",
  addAttributes() {
    return {
      ...this.parent?.(),
      ...commonAttributes,
    };
  },
  
    const styles = []
  if (attributes.align) styles.push(`text-align: ${attributes.align}`)
  if (attributes.vAlign) styles.push(`vertical-align: ${attributes.vAlign}`)
  return { style: styles.join('; ') }


  renderHTML({ HTMLAttributes }) {
    return ["th", mergeAttributes(HTMLAttributes), 0];
  },
});

// 3. Строка
export const Fb2TableRow = TableRow.extend({
  name: "fb2TableRow",
  content: "(fb2Td | fb2Th)*",
});

// 4. Таблица
export const Fb2Table = Table.extend({
  name: "fb2Table",
  content: "fb2TableRow+",

  addAttributes() {
    return {
      class: {
        default: "fb2-table",
      },
      id: {
        default: null,
        parseHTML: element => element.getAttribute('id'),
        renderHTML: attributes => attributes.id ? { id: attributes.id } : {},
      },
    };
  },
  addCommands() {
    return {
      ...this.parent?.(),
      setCellAlign:
        (alignment) =>
        ({ chain }) => {
          return chain()
            .updateAttributes("fb2Td", { align: alignment })
            .updateAttributes("fb2Th", { align: alignment })
            .run();
        },
      setCellVAlign:
        (valignment) =>
        ({ chain }) => {
          return chain()
            .updateAttributes("fb2Td", { valign: valignment })
            .updateAttributes("fb2Th", { valign: valignment })
            .run();
        },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "table",
      mergeAttributes(HTMLAttributes, { class: "fb2-table" }),
      ["tbody", 0],
    ];
  },
});
