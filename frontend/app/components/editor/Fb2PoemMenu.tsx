import React, { useState, useEffect } from "react";
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
    Signature
} from "lucide-react";
import { Fb2ActionIcon } from '../ui/Fb2ActionIcon'

interface Props {
    editor: Editor | null;
}

export const Fb2PoemMenu = ({ editor }: Props) => {
    const [isOpen, setIsOpen] = useState(false);

    const { refs, floatingStyles, update } = useFloating({
        open: isOpen,
        placement: "right-start",
        middleware: [offset({ mainAxis: 10, crossAxis: 0 }), flip(), shift()],
        whileElementsMounted: autoUpdate,
    });

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
    const canRemoveTextAuthor = editor.can().removeFb2TextAuthor();
    const canRemoveDate = editor.can().removeFb2Date();

    return (
        <FloatingPortal>
            <div
                ref={refs.setFloating}
                style={floatingStyles}
                className="z-[9999] flex flex-col bg-white border border-gray-200 rounded-lg shadow-xl p-1 gap-1 animate-in fade-in slide-in-from-left-2 duration-150"
            >
                {/* Удаление поэмы */}
                <div className="flex flex-col border-b pb-1 mb-1 gap-1">
                    <button type="button" onClick={() => editor.commands.deleteSelection()} title="Удалить всю поэму" className={twBtn}><Fb2ActionIcon icon={Feather} mode="remove" /></button>
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
                    className={twBtn}
                    title={canRemoveTitle ? "Удалить заголовок" : "Добавить заголовок"}
                >
                    <Fb2ActionIcon icon={Heading1} mode={canRemoveTitle ? "remove" : "add"} />
                </button>

                {/* Эпиграф */}
                <button type="button"
                    onClick={() => editor.chain().focus().insertFb2Epigraph().run()}
                    className={twBtn}
                    title="Добавить эпиграф"
                >
                    <Fb2ActionIcon icon={TextQuote} mode="add" />
                </button>

                {/* Подпись автора */}
                <button type="button"
                    onClick={() => editor.chain().focus().insertFb2TextAuthor().run()}
                    className={twBtn}
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
                    className={twBtn}
                    title={canRemoveDate ? "Удалить дату написания" : "Добавить дату написания"}
                >
                    <Fb2ActionIcon icon={CalendarDays} mode={canRemoveDate ? "remove" : "add"} />
                </button>
            </div>
        </FloatingPortal>
    );
};

// Tailwind-стиль для кнопок (вынесен для чистоты)
const twBtn = "p-2 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors text-gray-600";
