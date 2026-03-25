import React from "react";
import { Image, ImageDown, PanelTop, ChevronDown } from "lucide-react";
import { Editor } from "@tiptap/react";
import { Command, Extension } from "@tiptap/core";

// 1. Описываем типы для TypeScript
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fb2Commands: {
      // название группы команд
      canAddfb2BlockImage: () => ReturnType;
    };
  }
}

  const INLINE_ACTIVE_NODES = [
    "paragraph",
    "fb2V",
    "fb2TextAuthor",
    "fb2Subtitle",
  ];

export const ImageDropdown: React.FC<{
  onSelect: (type: "block" | "inline" | "section") => void;
  editor: Editor;
}> = ({ onSelect, editor }) => {
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
  if (!editor) return null;

  const canInsertInlineImage = INLINE_ACTIVE_NODES.some((name) =>
    editor.isActive(name),
  );

  const canInsertBlockImage = editor.can().canAddfb2BlockImage();
  // Общий стиль для кнопок, чтобы не дублировать
  const itemClass = "w-full flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 px-2 rounded text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200 flex items-center gap-1"
        title="Вставить изображение"
      >
        <Image size={20} />
        <ChevronDown
          size={14}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white border rounded-md shadow-lg z-30 py-1 overflow-hidden">
          <button
            key="block"
            type="button"
            disabled={!canInsertBlockImage}
            onClick={() => {
              onSelect("block");
              setIsOpen(false);
            }}
            className={itemClass}
          >
            <Image size={18} className="text-indigo-600" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-700">
                Блочное
              </span>
              <span className="text-[10px] text-gray-400">Между абзацами</span>
            </div>
          </button>

          <button
            key="inline"
            type="button"
            disabled={!canInsertInlineImage}
            onClick={() => {
              onSelect("inline");
              setIsOpen(false);
            }}
            onMouseDown={(e) => e.preventDefault()}
            className={itemClass}
          >
            <ImageDown size={18} className="text-indigo-600" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-700">
                В тексте
              </span>
              <span className="text-[10px] text-gray-400">Внутри строки</span>
            </div>
          </button>

          <button
            key="section"
            type="button"
            onClick={() => {
              onSelect("section");
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 text-left transition-colors"
          >
            <PanelTop size={18} className="text-indigo-600" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-700">
                В заголовок секции
              </span>
              <span className="text-[10px] text-gray-400">
                Виньетка раздела
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
