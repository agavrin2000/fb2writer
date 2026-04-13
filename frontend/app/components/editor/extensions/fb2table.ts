import { mergeAttributes } from '@tiptap/core'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'

// 1. Сама таблица
export const Fb2Table = Table.extend({
    name: 'fb2Table',
    parseHTML() {
        return [{ tag: 'table' }]
    },
    renderHTML(attributes) {
        return ['table', mergeAttributes(attributes, { class: 'fb2-table' }), ['tbody', 0]]
    },
})

// 2. Строка таблицы
export const Fb2TableRow = TableRow.extend({
    name: 'fb2TableRow',
    parseHTML() {
        return [{ tag: 'tr' }]
    },
})

// 3. Ячейка (в FB2 это <td>)
export const Fb2TableCell = TableCell.extend({
    name: 'fb2TableCell',
    content: 'paragraph+', // Важно: в FB2 ячейка содержит блоки (обычно <p>)
    addAttributes() {
        return {
            ...this.parent?.(),
            align: {
                default: 'left',
                parseHTML: (element: HTMLElement) => element.getAttribute('align'),
                renderHTML: (attributes) => ({ align: attributes.align }),
            },
            valign: {
                default: 'top',
                parseHTML: (element: HTMLElement) => element.getAttribute('valign'),
                renderHTML: (attributes) => ({ valign: attributes.valign }),
            },
        }
    },
})