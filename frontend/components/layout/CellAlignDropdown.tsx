import React, { useState, useRef, useEffect } from "react";
import {
    ChevronDown, TextAlignJustify, TextAlignCenter, TextAlignEnd, TextAlignStart,
    AlignCenterHorizontal, AlignEndHorizontal, AlignStartHorizontal
} from "lucide-react";

const ALIGN_OPTIONS = [
    { id: "alignLeft", title: "Выровнять влево", Icon: TextAlignStart },
    { id: "alignCenter", title: "Выровнять по центру", Icon: TextAlignCenter },
    { id: "alignRight", title: "Выровнять вправо", Icon: TextAlignEnd },
    { id: "valignTop", title: "Выровнять сверху", Icon: AlignStartHorizontal },
    { id: "valignMiddle", title: "Выровнять по середине", Icon: AlignCenterHorizontal },
    { id: "valignBottom", title: "Выровнять снизу", Icon: AlignEndHorizontal },
];

export const CellAlignDropdown: React.FC<{
    onSelect: (type: string) => void;
    canAllign: boolean;
}> = ({ onSelect, canAllign }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (!dropdownRef.current?.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            <button
                title="Выравнивание ячейки"
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={!canAllign}
                className="p-1.5 px-2 rounded text-ui-text-muted hover:bg-ui-bg-hover border border-transparent hover:border-ui-border flex items-center gap-1 transition-all"
            >
                <TextAlignJustify size={20} />
                <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 min-w-[44px] bg-ui-bg border border-ui-border rounded-xl shadow-xl z-30 py-1.5 flex flex-col animate-in fade-in zoom-in-95 duration-150">
                    {ALIGN_OPTIONS.map(({ id, title, Icon }) => (
                        <button
                            key={id}
                            title={title}
                            type="button"
                            onClick={() => {
                                onSelect(id);
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center justify-center px-4 py-2 hover:bg-ui-bg-hover transition-colors text-ui-text"
                        >
                            <Icon size={20} className="shrink-0" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
