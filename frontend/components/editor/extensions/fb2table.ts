import { mergeAttributes, Attributes } from "@tiptap/core";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fb2TableCommands: {
      setCellAlign: (
        alignment: "left" | "center" | "right",
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
    keepOnSplit: false,
    renderHTML: (attr: Attributes) => {
      const colspan = Number(attr.colspan);
      return colspan > 1 ? { colspan } : {};
    },
  },
  rowspan: {
    default: 1,
    parseHTML: (el: HTMLElement) =>
      parseInt(el.getAttribute("rowspan") || "1", 10),
    keepOnSplit: false,
    renderHTML: (attr: Attributes) => {
      const rowspan = Number(attr.rowspan);
      return rowspan > 1 ? { rowspan } : {};
    },
  },
};

// Ячейка данных
export const Fb2Td = TableCell.extend({
  name: "tableCell",
  tableRole: "cell",
  content: "inline*",
  addAttributes() {
    return {
      ...this.parent?.(), // Наследуем базовые атрибуты 
      ...commonAttributes,
    };
  },
  renderHTML: ({ HTMLAttributes }) => {
    const styles = [];
    if (HTMLAttributes.align)
      styles.push(`text-align: ${HTMLAttributes.align}`);
    if (HTMLAttributes.valign)
      styles.push(`vertical-align: ${HTMLAttributes.valign}`);

    return [
      "td",
      mergeAttributes(HTMLAttributes, { style: styles.join("; ") }),
      0,
    ];
  },
});

// Ячейка заголовка
export const Fb2Th = TableHeader.extend({
  name: "tableHeader",
  content: "inline*",
  tableRole: "header_cell",
  addAttributes() {
    return {
      ...this.parent?.(),
      ...commonAttributes,
    };
  },

  renderHTML: ({ HTMLAttributes }) => {
    const styles = [];
    if (HTMLAttributes.align)
      styles.push(`text-align: ${HTMLAttributes.align}`);
    if (HTMLAttributes.valign)
      styles.push(`vertical-align: ${HTMLAttributes.valign}`);

    return [
      "th",
      mergeAttributes(HTMLAttributes, { style: styles.join("; ") }),
      0,
    ];
  },
});

// 3. Строка
export const Fb2TableRow = TableRow.extend({
  name: "tableRow",
  tableRole: "row",
  content: "(tableHeader | tableCell)*",
});

// 4. Таблица
export const Fb2Table = Table.extend({
  name: "table",
  content: "tableRow+",
  tableRole: "table", 
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: "fb2-table",
      },
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("id"),
        renderHTML: (attributes) =>
          attributes.id ? { id: attributes.id } : {},
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
            .updateAttributes("tableCell", { align: alignment })
            .updateAttributes("tableHeader", { align: alignment })
            .run();
        },
      setCellVAlign:
        (valignment) =>
        ({ chain }) => {
          return chain()
            .updateAttributes("tableCell", { valign: valignment })
            .updateAttributes("tableHeader", { valign: valignment })
            .run();
        },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "table",
      mergeAttributes(HTMLAttributes, { class: "fb2-table" }),
      0,
    ];
  },
});
