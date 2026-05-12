import React, { useState, useRef, useEffect } from "react";
import {
    Table as TableIcon, TableCellsMerge, TableCellsSplit, Columns3, Rows3,
    ChevronDown, ChevronRight, TextAlignJustify, TextAlignStart, TextAlignCenter,
    TextAlignEnd, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal
} from "lucide-react";
import { Fb2ActionIcon } from "../ui/Fb2ActionIcon";

const ALIGN_OPTIONS = [
    { id: "alignLeft", title: "Влево", Icon: TextAlignStart },
    { id: "alignCenter", title: "По центру", Icon: TextAlignCenter },
    { id: "alignRight", title: "Вправо", Icon: TextAlignEnd },
    { id: "valignTop", title: "Сверху", Icon: AlignStartHorizontal },
    { id: "valignMiddle", title: "По середине", Icon: AlignCenterHorizontal },
    { id: "valignBottom", title: "Снизу", Icon: AlignEndHorizontal },
];

export const TableDropdown: React.FC<{
    onSelect: (type: string) => void;
    canAddTable: boolean;
    canRemoveTable: boolean;
    canAddColumn: boolean;
    canRemoveColumn: boolean;
    canAddRow: boolean;
    canRemoveRow: boolean;
    canMergeCells: boolean;
    canSplitCell: boolean;
    canAlign: boolean;
}> = ({ onSelect, canAddTable, canRemoveTable, canAddColumn, canRemoveColumn, canAddRow, canRemoveRow, canMergeCells, canSplitCell, canAlign }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isAlignOpen, setIsAlignOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (!dropdownRef.current?.contains(e.target as Node)) {
                setIsOpen(false);
                setIsAlignOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const handleAction = (id: string) => {
        onSelect(id);
        setIsOpen(false);
        setIsAlignOpen(false);
    };

    const tableItems = [
        { id: canAddTable ? "addTable" : "removeTable", title: !canRemoveTable ? "Вставить таблицу" : "Удалить таблицу", disabled: !canAddTable && !canRemoveTable, content: <Fb2ActionIcon icon={TableIcon} mode={!canAddTable ? "remove" : "add"} /> },
        { id: "addColumn", title: "Добавить столбец", disabled: !canAddColumn, content: <Fb2ActionIcon icon={Columns3} mode="add" /> },
        { id: "removeColum", title: "Удалить столбец", disabled: !canRemoveColumn, content: <Fb2ActionIcon icon={Columns3} mode="remove" /> },
        { id: "addRow", title: "Добавить строку", disabled: !canAddRow, content: <Fb2ActionIcon icon={Rows3} mode="add" /> },
        { id: "removeRow", title: "Удалить строку", disabled: !canRemoveRow, content: <Fb2ActionIcon icon={Rows3} mode="remove" /> },
        { id: canMergeCells ? "mergeCells" : "splitCell", title: canMergeCells ? "Объединить ячейки" : "Разделить ячейку", disabled: !canMergeCells && !canSplitCell, content: canMergeCells ? <TableCellsMerge size={20} /> : <TableCellsSplit size={20} /> },
    ];

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            <button
                type="button"
                title="Таблицы"
                disabled={!canAddTable && !canRemoveTable}
                onClick={() => setIsOpen(!isOpen)}
                onMouseDown={(e) => e.preventDefault()}
                className="p-1.5 px-2 rounded text-ui-text-muted hover:bg-ui-bg-hover disabled:opacity-30 border border-ui-border flex items-center gap-1 transition-all"
            >
                <TableIcon size={20} />
                <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                /* УБРАНО: overflow-hidden. ДОБАВЛЕНО: z-30 */
                <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-ui-bg border border-ui-border rounded-xl shadow-xl z-30 py-1.5 flex flex-col animate-in fade-in zoom-in-95 duration-150">

                    {tableItems.map((item) => (
                        <button
                            type="button"
                            key={item.id}
                            disabled={item.disabled}
                            onClick={() => handleAction(item.id)}
                            onMouseDown={(e) => e.preventDefault()}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-ui-bg-hover disabled:opacity-30 transition-colors text-ui-text"
                        >
                            {item.content}
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-ui-text">{item.title}</span>
                            </div>
                        </button>
                    ))}

                    <div className="h-px bg-ui-border my-1 mx-2" />

                    {/* Контейнер для подменю */}
                    <div
                        className="relative"
                        onMouseEnter={() => setIsAlignOpen(true)}
                        onMouseLeave={() => setIsAlignOpen(false)}
                    >
                        <button
                            type="button"
                            className={`w-full flex items-center justify-between px-4 py-2 transition-colors ${isAlignOpen ? 'bg-ui-bg-hover' : ''}`}
                        >
                            <div className="flex items-center gap-3 text-ui-text">
                                <TextAlignJustify size={20} className="shrink-0" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold text-ui-text">Выравнивание</span>
                                </div>
                            </div>
                            <ChevronRight size={14} className="text-ui-text-muted" />
                        </button>

                        {/* Подменю: выпадает вправо */}
                        {isAlignOpen && (
                            <div className="absolute top-[-6px] left-[calc(100%-4px)] pl-2 z-40">
                                <div className="bg-ui-bg border border-ui-border rounded-xl shadow-2xl p-1.5 grid grid-cols-3 gap-1 min-w-[120px]">
                                    {ALIGN_OPTIONS.map(({ id, title, Icon }) => (
                                        <button
                                            key={id}
                                            title={title}
                                            type="button"
                                            disabled={!canAlign}
                                            onClick={() => handleAction(id)}
                                            className="p-2.5 flex items-center justify-center rounded-lg hover:bg-ui-bg-hover transition-colors text-ui-text hover:text-ui-primary"
                                        >
                                            <Icon size={20} className="shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
