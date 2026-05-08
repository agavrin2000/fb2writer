import React from "react";
import { Table as TableIcon, TableCellsMerge, TableCellsSplit, Columns3, Rows3, ChevronDown, TextAlignJustify, TextAlignCenter, TextAlignEnd, TextAlignStart, AlignStartVertical, AlignCenterHorizontal, AlignEndHorizontal } from "lucide-react";
import { Fb2ActionIcon } from "../ui/Fb2ActionIcon";

/**
 * Компонент выпадающего меню для работы с таблицами
 */
export const CellAlignDropdown: React.FC<{
    /**
   * Обработчик команды
   * @param type - Тип команды
   */
    onSelect: (type: string) => void;
    canAllign: boolean;

}> = ({ onSelect, canAllign }) => {
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
                disabled={!canAllign}
                className="p-1.5 px-2 rounded text-ui-text-muted hover:bg-ui-bg-hover border border-transparent hover:border-ui-border flex items-center gap-1 transition-all"
                title="Работа с таблицами"
            >
                <TextAlignJustify size={20} />
                <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 bg-ui-bg border border-ui-border rounded-xl shadow-xl z-30 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <button
                        title="Выровнять влево"
                        key="alignleft"
                        type="button"
                        onClick={() => {
                            onSelect("alignLeft");
                            setIsOpen(false);
                        }}
                        className={itemClass}
                    >
                        <TextAlignStart size={20} />
                    </button>

                    <button
                        title="Выровнять влево"
                        key="alignCenter"
                        type="button"
                        onClick={() => {
                            onSelect("alignCenter");
                            setIsOpen(false);
                        }}
                        className={itemClass}
                    >
                        <TextAlignCenter size={20} />
                    </button>
                </div>
            )}
        </div>
    );
};
