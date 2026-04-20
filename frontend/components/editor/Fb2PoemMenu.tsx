import { cn } from "@/utils/cn";
import { useState, useEffect, useRef } from "react";
import { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import {
    useFloating,
    offset,
    flip,
    shift,
    autoUpdate,
    FloatingPortal,
} from "@floating-ui/react";
import {
    Heading1, TextQuote,
    Feather,
    CalendarDays,
    Signature,
    Anchor
} from "lucide-react";
import { Fb2ActionIcon } from '../ui/Fb2ActionIcon'

interface Props {
    editor: Editor | null;
}

export const Fb2PoemMenu = ({ editor }: Props) => {
    const [isOpen, setIsOpen] = useState(false);
    const isTyping = useRef(false);

    const { refs, floatingStyles, update } = useFloating({
        open: isOpen,
        placement: "right-start",
        middleware: [offset({ mainAxis: 10, crossAxis: 0 }), flip(), shift()],
        whileElementsMounted: autoUpdate,
    });
    const selection = editor?.state.selection;
    const isSection =
        selection instanceof NodeSelection &&
        selection.node.type.name === "fb2Section";
    const currentElementId = isSection
        ? selection.node.attrs.elementId || ""
        : "";

    const [localId, setLocalId] = useState(currentElementId);

    // Синхронизация локального ID с состоянием редактора
    useEffect(() => {
        if (!isTyping.current && localId !== currentElementId) {
            queueMicrotask(() => {
                setLocalId(currentElementId);
            });
        }
    }, [currentElementId, localId]);

    useEffect(() => {
        if (!editor) return;

        const updateMenu = () => {
            const { selection } = editor.state;
            const isPoemSelected = selection instanceof NodeSelection && selection.node.type.name === "fb2Poem";

            if (isPoemSelected) {
                const dom = editor.view.nodeDOM(selection.from) as HTMLElement;
                const handle = dom?.querySelector(".poem-handle");
                if (handle) {
                    refs.setPositionReference({
                        getBoundingClientRect: () => handle.getBoundingClientRect(),
                    });
                    setIsOpen(true);
                }
            } else {
                setIsOpen(false);
            }
        };

        const handleClickOutside = (event: MouseEvent) => {
            if (!isOpen) return;
            const target = event.target as HTMLElement;
            if (!refs.floating.current?.contains(target) && !target.closest('.poem-handle')) {
                editor.commands.focus();
                setIsOpen(false);
            }
        };

        editor.on("selectionUpdate", updateMenu);
        window.addEventListener("scroll", update, true);
        window.addEventListener("mousedown", handleClickOutside);

        return () => {
            editor.off("selectionUpdate", updateMenu);
            window.removeEventListener("scroll", update, true);
            window.removeEventListener("mousedown", handleClickOutside);
        };
    }, [editor, refs, update, isOpen]);

    if (!isOpen || !editor) return null;

    // Проверяем наличие элементов внутри выделенной секции
    const canRemoveTitle = editor.can().removeFb2Title();
    const canRemoveDate = editor.can().removeFb2Date();

    return (
        <FloatingPortal>
            <div
                ref={(node) => { refs.setFloating(node); }}
                style={floatingStyles}
                className="z-[9999] flex flex-col border border-[var(--color-ui-border)] bg-[var(--color-ui-bg)] rounded-lg shadow-[var(--shadow-dropdown)] p-1 gap-1 animate-in fade-in slide-in-from-left-2 duration-150"
            >
                {/* Поле ввода Element ID */}
                <div className="flex flex-col border-b border-[var(--color-ui-border)] pb-1 mb-1 gap-1 group relative">
                    <div className="flex items-center justify-center p-2 text-[var(--color-ui-text)]">
                        <Anchor size={16} />
                    </div>

                    {/* Всплывающий инпут */}
                    <input
                        type="text"
                        value={localId}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            isTyping.current = true;
                        }}
                        onFocus={() => {
                            isTyping.current = true;
                        }}
                        onBlur={() => {
                            isTyping.current = false;
                        }}
                        onChange={(e) => {
                            const val = e.target.value;
                            setLocalId(val);
                            editor.commands.updateAttributes("fb2Section", {
                                elementId: val,
                            });
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                isTyping.current = false;
                                editor.commands.focus();
                            }
                            e.stopPropagation();
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        placeholder="ID секции..."
                        className="absolute left-full ml-2 top-0 bg-[var(--color-paper-bg)] border border-[var(--color-ui-border)] text-[var(--color-ui-text)] rounded-md shadow-[var(--shadow-dropdown)] p-1 text-[10px] w-24 outline-none focus:border-[var(--color-ui-accent)]"
                    />
                </div>


                {/* Удаление поэмы */}
                <div className="flex flex-col border-b pb-1 mb-1 gap-1">
                    <button type="button" onClick={() => editor.commands.deleteSelection()} title="Удалить всю поэму"
                        className={cn("toolbar-btn", "toolbar-btn-default")}
                    >
                        <Fb2ActionIcon icon={Feather} mode="remove" /></button>
                </div>

                {/* Заголовок */}
                <button type="button"
                    onClick={() => {
                        const chain = editor.chain().focus();
                        if (canRemoveTitle) {
                            // 1. Сначала закрываем меню вручную
                            setIsOpen(false);
                            // 2. Затем выполняем команду удаления
                            chain.removeFb2Title().setTextSelection(editor.state.selection.from).run();
                        } else {
                            chain.insertFb2Title().run();
                        }
                    }}
                    className={cn("toolbar-btn", "toolbar-btn-default")}
                    title={canRemoveTitle ? "Удалить заголовок" : "Добавить заголовок"}
                >
                    <Fb2ActionIcon icon={Heading1} mode={canRemoveTitle ? "remove" : "add"} />
                </button>

                {/* Эпиграф */}
                <button type="button"
                    onClick={() => editor.chain().focus().insertFb2Epigraph().run()}
                    className={cn("toolbar-btn", "toolbar-btn-default")}
                    title="Добавить эпиграф"
                >
                    <Fb2ActionIcon icon={TextQuote} mode="add" />
                </button>

                {/* Подпись автора */}
                <button type="button"
                    onClick={() => editor.chain().focus().insertFb2TextAuthor().run()}
                    className={cn("toolbar-btn", "toolbar-btn-default")}
                    title="Добавить подпись автора"
                >
                    <Fb2ActionIcon icon={Signature} mode="add" />
                </button>

                {/* Дата написания */}
                <button type="button"
                    onClick={() => {
                        const chain = editor.chain().focus();
                        if (canRemoveDate) {
                            // 1. Сначала закрываем меню вручную
                            setIsOpen(false);
                            // 2. Затем выполняем команду удаления
                            chain.removeFb2Date().setTextSelection(editor.state.selection.from).run();
                        } else {
                            chain.insertFb2Date().run();
                        }
                    }}
                    className={cn("toolbar-btn", "toolbar-btn-default")}
                    title={canRemoveDate ? "Удалить дату написания" : "Добавить дату написания"}
                >
                    <Fb2ActionIcon icon={CalendarDays} mode={canRemoveDate ? "remove" : "add"} />
                </button>
            </div>
        </FloatingPortal>
    );
};
