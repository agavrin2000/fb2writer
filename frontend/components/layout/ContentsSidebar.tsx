"use client";
import React, { memo } from "react";
import { Editor } from "@tiptap/react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { TocItem } from "@/types/types";
import { useActiveHeading } from "@/hooks/useActiveHeading";

export const ContentsSidebar = memo(
  ({
    editor, // <--- Добавляем инстанс редактора сюда
    tree,
    onSelectHeading,
    isOpen,
    onToggle,
  }: {
    editor: Editor | null; // Тип из @tiptap/react
    tree: TocItem[];
    onSelectHeading: (item: TocItem) => void;
    isOpen: boolean;
    onToggle: () => void;
  }) => {

    const activePos = useActiveHeading(editor, tree || []);
    const handleItemClick = (item: TocItem) => {
      onSelectHeading(item);
    };

    const renderTocBranch = (items: TocItem[], level = 0) => {
      if (!items || items.length === 0) return null;
      const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
        const button = e.currentTarget;
        const textSpan = button.querySelector("span"); // Ищем вложенный текст

        if (textSpan && textSpan.scrollWidth > textSpan.clientWidth) {
          button.title = textSpan.innerText;
        } else {
          button.removeAttribute("title");
        }
      };
      return (
        <div className={`relative ${level > 0 ? "ml-3 border-l-2 border-ui-border" : ""}`}>
          {items.map((item, index) => (
            <div key={item.pos} className="relative flex flex-col">
              {/* Горизонтальный отвод */}
              {level > 0 && (
                <div className="absolute left-0 top-[15px] w-3 border-t-2 border-ui-border" />
              )}

              <button
                type="button"
                onMouseEnter={handleMouseEnter}
                onClick={() => handleItemClick(item)}
                style={{ paddingLeft: level > 0 ? "28px" : "12px" }}
                className={`relative z-10 w-full text-left pr-3 py-1.5 text-[11px] rounded transition-all mb-0.5 flex items-center ${activePos === item.pos
                    ? "bg-ui-accent text-ui-accent-foreground font-bold shadow-md shadow-ui-accent/20"
                    : "text-ui-text-muted hover:bg-ui-bg-hover hover:text-ui-text font-medium"
                  }`}
              >
                <span className="block truncate w-full pointer-events-none">
                  {item.text}
                </span>
              </button>

              {item.children &&
                item.children.length > 0 &&
                renderTocBranch(item.children, level + 1)}

              {/* "Заглушка" снизу: теперь она использует фон UI, чтобы быть невидимой */}
              {index === items.length - 1 && level > 0 && (
                <div className="absolute -left-[2px] top-[15px] bottom-0 w-1 bg-ui-bg" />
              )}
            </div>
          ))}
        </div>
      );
    };

    return (
      <div className="relative flex h-full">
        {/* Кнопка открытия (Плавающая) */}
        {!isOpen && (
          <button
            type="button"
            onClick={onToggle}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-ui-bg border border-ui-border border-l-0 p-2 rounded-r-xl shadow-lg hover:bg-ui-bg-hover text-ui-accent transition-all animate-in slide-in-from-left duration-200 ease-out"
            title="Открыть структуру книги"
          >
            <ChevronRight size={20} strokeWidth={3} />
          </button>
        )}

        {/* Основной контейнер сайдбара */}
        <aside
          className={`
                relative flex flex-col border-r border-ui-border bg-ui-bg shadow-xl z-40 transition-all duration-300 ease-in-out
                ${isOpen ? "w-72 opacity-100" : "w-0 opacity-0 overflow-hidden"}
            `}
        >
          {/* Шапка */}
          <div className="p-4 border-b border-ui-border bg-ui-bg-hover/50 flex justify-between items-center min-w-[288px]">
            <span className="text-[10px] font-bold text-ui-text-muted uppercase tracking-wider">
              Структура
            </span>
            <button
              type="button"
              title="Закрыть"
              onClick={onToggle}
              className="p-1 rounded hover:bg-ui-bg-hover text-ui-text-muted hover:text-ui-text transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
          </div>

          {/* Контент (дерево) */}
          <div className="grow overflow-y-auto p-4 custom-scrollbar">
            {renderTocBranch(tree)}
          </div>
        </aside>
      </div>
    );
  },
);

ContentsSidebar.displayName = "ContentsSidebar";