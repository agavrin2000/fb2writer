import React, { useState, useEffect, useRef } from "react";
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
  ListStart,
  ListEnd,
  Heading1,
  TextQuote,
  Layers,
  BookImage,
  FileText,
  Rows2,
  Anchor,
} from "lucide-react";
import { Fb2ActionIcon } from "../ui/Fb2ActionIcon";

interface Props {
  editor: Editor | null;
  onSelectImage: (type: "block" | "inline" | "section") => void; // Добавляем проп для картинок
}

export const Fb2SectionMenu = ({ editor, onSelectImage }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const isTyping = useRef(false);
  // Плавающий элемент
  const { refs, floatingStyles, update } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "right-start",
    middleware: [offset({ mainAxis: 10, crossAxis: 0 }), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  // Состояние для отслеживания текущего выделени
  const selection = editor?.state.selection;
  const isSection =
    selection instanceof NodeSelection &&
    selection.node.type.name === "fb2Section";
  const currentLevel = isSection ? selection.node.attrs.level || 1 : 1;
  const currentElementId = isSection
    ? selection.node.attrs.elementId || ""
    : "";

  const [localId, setLocalId] = useState(currentElementId);

useEffect(() => {
  if (!isTyping.current && localId !== currentElementId) {
    // Оборачиваем в микрозадачу, чтобы убрать ошибку каскадного рендера
    queueMicrotask(() => {
      setLocalId(currentElementId);
    });
  }
}, [currentElementId, localId]);

  useEffect(() => {
    if (!editor) return;

    const updateMenu = () => {
      if (isOpen && isTyping.current) return;
      const { selection } = editor.state;
      const isSectionSelected =
        selection instanceof NodeSelection &&
        selection.node.type.name === "fb2Section";

      if (isSectionSelected) {
        const dom = editor.view.nodeDOM(selection.from) as HTMLElement;
        const handle = dom?.querySelector(".section-handle");
        if (handle) {
          refs.setPositionReference({
            getBoundingClientRect: () => handle.getBoundingClientRect(),
          });
          setIsOpen(true);
        }
      } else {
        setIsOpen(false);
        isTyping.current = false;
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      // Используем актуальное состояние через проверку refs
      if (!refs.floating.current) return;

      const target = event.target as HTMLElement;
      if (
        !refs.floating.current.contains(target) &&
        !target.closest(".section-handle")
      ) {
        setIsOpen(false);
        isTyping.current = false;
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
  }, [editor, update, isOpen, refs]);

  if (!isOpen || !editor) return null;

  // Проверяем наличие элементов внутри выделенной секции
  const canRemoveTitle = editor.can().removeFb2Title();
  const canRemoveAnnotation = editor.can().removeFb2Annotation();
  const canRemoveSection = editor.can().removeFb2Section();

  // Добавление новой секции
  const addFb2Section = (position: "after" | "start" | "end") => {
    const { selection } = editor.state;
    if (!(selection instanceof NodeSelection)) return;

    const currentLevel = selection.node.attrs.level || 1;
    const insertPos =
      position === "start"
        ? selection.from + 1
        : position === "after"
          ? selection.to
          : selection.to - 1;
    const targetLevel = position === "after" ? currentLevel : currentLevel + 1;

    editor
      .chain()
      .focus()
      .insertContentAt(insertPos, {
        type: "fb2Section",
        attrs: { level: targetLevel },
        content: [
          {
            type: "fb2Title",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Новый раздел" }],
              },
            ],
          },
          { type: "paragraph", content: [{ type: "text", text: "Текст..." }] },
        ],
      })
      .run();
  };

  return (
    <FloatingPortal>
      <div
        ref={(node) => { refs.setFloating(node); }}
        style={floatingStyles}
        className="z-[9999] flex flex-col bg-white border border-gray-200 rounded-lg shadow-xl p-1 gap-1 animate-in fade-in slide-in-from-left-2 duration-150"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Индикатор уровня вложенности */}
        <div
          className="flex items-center justify-center gap-1 py-1.5 border-b mb-1 bg-gray-50 rounded-t-md"
          title={`Уровень вложенности: ${currentLevel}`}
        >
          <Layers size={12} className="text-gray-400" />
          <span className="text-[11px] font-black text-indigo-600 leading-none">
            {currentLevel}
          </span>
        </div>
        {/* Поле ввода Element ID */}
        <div className="flex flex-col border-b pb-1 mb-1 gap-1 group relative">
          <div className="flex items-center justify-center p-2 text-gray-400">
            <Anchor size={16} />
          </div>
          {/* Всплывающий инпут при наведении или фокусе на иконку ID */}
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
              // Обновляем атрибуты в редакторе в реальном времени,
              // но благодаря isTyping.current это не закроет меню
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
            className="absolute left-full ml-2 top-0 bg-white border border-gray-200 rounded-md shadow-lg p-1 text-[10px] w-24 outline-none focus:border-indigo-400"
          />
        </div>

        {/* Группа: Структура секций */}
        <div className="flex flex-col border-b gap-1">
          <button
            type="button"
            onClick={() => addFb2Section("after")}
            className={twBtn}
            title="Добавить раздел ниже"
          >
            <Fb2ActionIcon icon={Rows2} mode="add" />
          </button>
          <button
            type="button"
            onClick={() => addFb2Section("start")}
            className={twBtn}
            title="Подраздел в начало"
          >
            <ListStart size={16} />
          </button>
          <button
            type="button"
            onClick={() => addFb2Section("end")}
            className={twBtn}
            title="Подраздел в конец"
          >
            <ListEnd size={16} />
          </button>

          {/* Удаление раздела */}
          {canRemoveSection && (
            <button
              type="button"
              onClick={() => editor.chain().focus().removeFb2Section().run()}
              className={twBtn}
              title="Удалить всю секцию"
            >
              <Fb2ActionIcon icon={Rows2} mode="remove" />
            </button>
          )}
        </div>

        {/* Группа: Внутренние элементы (Title / Epigraph) */}
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() =>
              canRemoveTitle
                ? editor.chain().focus().removeFb2Title().run()
                : editor.chain().focus().insertFb2Title().run()
            }
            className={twBtn}
            title={canRemoveTitle ? "Удалить заголовок" : "Добавить заголовок"}
          >
            <Fb2ActionIcon
              icon={Heading1}
              mode={canRemoveTitle ? "remove" : "add"}
            />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().insertFb2Epigraph().run()}
            className={twBtn}
            title="Добавить эпиграф"
          >
            <Fb2ActionIcon icon={TextQuote} mode="add" />
          </button>

          <button
            type="button"
            onClick={() => onSelectImage("section")}
            className={twBtn}
            title="Картинка секции"
          >
            <BookImage size={16} />
          </button>

          <button
            type="button"
            onClick={() =>
              canRemoveAnnotation
                ? editor.chain().focus().removeFb2Annotation().run()
                : editor.chain().focus().insertFb2Annotation().run()
            }
            className={twBtn}
            title={
              canRemoveAnnotation ? "Удалить аннотацию" : "Добавить аннотацию"
            }
          >
            <Fb2ActionIcon
              icon={FileText}
              mode={canRemoveAnnotation ? "remove" : "add"}
            />
          </button>
        </div>
      </div>
    </FloatingPortal>
  );
};

// Tailwind-стиль для кнопок (вынесен для чистоты)
const twBtn =
  "p-2 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors text-gray-600";
