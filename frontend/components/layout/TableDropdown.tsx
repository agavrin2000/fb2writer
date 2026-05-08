import React from "react";
import { Table as TableIcon, TableCellsMerge, TableCellsSplit, Columns3, Rows3, ChevronDown, TextAlignCenter, TextAlignEnd, TextAlignStart, AlignStartVertical, AlignCenterHorizontal, AlignEndHorizontal } from "lucide-react";
import { Fb2ActionIcon } from "../ui/Fb2ActionIcon";

/**
 * Компонент выпадающего меню для работы с таблицами
 */
export const TableDropdown: React.FC<{
    /**
   * Обработчик команды
   * @param type - Тип команды: `"block"`, `"inline"` или `"section"`.
   */
    onSelect: (type: string) => void;
    canAddTable: boolean;
    canRemoveTable: boolean;
    canAddColumn: boolean;
    canRemoveColumn: boolean;
    canAddRow: boolean;
    canRemoveRow: boolean;
    canMergeCells: boolean;
    canSplitCells: boolean;

}> = ({ onSelect, canAddTable, canRemoveTable, canAddColumn, canRemoveColumn, canAddRow, canRemoveRow, canMergeCells, canSplitCells }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Закрытие при клике вне меню
    React.useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Общий стиль для пунктов меню
    const itemClass = "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-ui-bg-hover disabled:opacity-40 disabled:cursor-not-allowed";

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={!canAddTable && !canRemoveTable && !canAddColumn && !canRemoveColumn && !canAddRow && !canRemoveRow && !canMergeCells && !canSplitCells}
                className="p-1.5 px-2 rounded text-ui-text-muted hover:bg-ui-bg-hover border border-transparent hover:border-ui-border flex items-center gap-1 transition-all"
                title="Работа с таблицами"
            >
                <TableIcon size={20} />
                <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 bg-ui-bg border border-ui-border rounded-xl shadow-xl z-30 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <button
                        title={canAddTable ? "Вставить таблицу" : "Удалить таблицу"}
                        key="table"
                        type="button"
                        disabled={!canAddTable && !canRemoveTable}
                        onClick={() => {
                            onSelect(canAddTable ? "addTable" : "removeTable");
                            setIsOpen(false);
                        }}
                        className={itemClass}
                    >
                        <Fb2ActionIcon
                            icon={TableIcon}
                            mode={!canAddTable ? "remove" : "add"}
                        />
                    </button>

                    <button
                        key="addcolumn"
                        type="button"
                        title="Вставить столбец после"
                        disabled={!canAddColumn}
                        onClick={() => {
                            onSelect("addColumn");
                            setIsOpen(false);
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        className={itemClass}
                    >
                        <Fb2ActionIcon
                            icon={Columns3}
                            mode="add"
                        />
                    </button>

                    <button
                        key="removecolumn"
                        type="button"
                        title="Удалить столбец"
                        disabled={!canRemoveColumn}
                        onClick={() => {
                            onSelect("removeColum");
                            setIsOpen(false);
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        className={itemClass}
                    >
                        <Fb2ActionIcon
                            icon={Columns3}
                            mode="remove"
                        />
                    </button>

                    <button
                        key="addrow"
                        type="button"
                        title="Вставить строку после"
                        disabled={!canAddRow}
                        onClick={() => {
                            onSelect("addRow");
                            setIsOpen(false);
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        className={itemClass}
                    >
                        <Fb2ActionIcon
                            icon={Rows3}
                            mode="add"
                        />
                    </button>

                    <button
                        key="removerow"
                        type="button"
                        title="Удалить строку"
                        disabled={!canRemoveRow}
                        onClick={() => {
                            onSelect("removeRow");
                            setIsOpen(false);
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        className={itemClass}
                    >
                        <Fb2ActionIcon
                            icon={Rows3}
                            mode="remove"
                        />
                    </button>

                    <button
                        key="merge"
                        type="button"
                        title="Объединить ячейки"
                        disabled={!canMergeCells}
                        onClick={() => {
                            onSelect("mergeCells");
                            setIsOpen(false);
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        className={itemClass}
                    >
                        <TableCellsMerge size={20} />
                    </button>

                    <button
                        key="split"
                        type="button"
                        title="Разделить ячейки"
                        disabled={!canSplitCells}
                        onClick={() => {
                            onSelect("splitCells");
                            setIsOpen(false);
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        className={itemClass}
                    >
                        <TableCellsSplit size={20} />
                    </button>
                </div>
            )}
        </div>
    );
};
