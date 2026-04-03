"use client";
import React, { memo } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { TocItem } from "@/types/types";
import { useActiveHeading } from "@/hooks/useActiveHeading";
import { Editor } from "@tiptap/react";

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
        <div
          className={`relative ${level > 0 ? "ml-3 border-l-2 border-slate-300" : ""}`}
        >
          {items.map((item, index) => (
            <div key={item.pos} className="relative flex flex-col">
              {/* Горизонтальный отвод (рисуем для всех уровней > 0) */}
              {level > 0 && (
                <div className="absolute left-0 top-[15px] w-3 border-t-2 border-slate-300" />
              )}

              <button
                type="button"
                onMouseEnter={handleMouseEnter}
                onClick={() => handleItemClick(item)}
                // Используем padding вместо margin, чтобы hover не вылезал вправо
                style={{ paddingLeft: level > 0 ? "28px" : "12px" }}
                className={`relative z-10 w-full text-left pr-3 py-1.5 text-[11px] rounded transition-all mb-0.5 flex items-center ${
                  activePos === item.pos
                    ? "bg-blue-600 text-white font-bold"
                    : "text-gray-700 hover:bg-gray-100 font-medium"
                }`}
              >
                {/* ВАЖНО: оборачиваем текст в span для корректного замера ширины */}
                <span className="block truncate w-full pointer-events-none">
                  {item.text}
                </span>
              </button>
              {/* Рекурсия для детей */}
              {item.children &&
                item.children.length > 0 &&
                renderTocBranch(item.children, level + 1)}

              {/* "Заглушка" снизу: обрезает линию после последнего ребенка в ветке */}
              {index === items.length - 1 && level > 0 && (
                <div className="absolute -left-[2px] top-[15px] bottom-0 w-1 bg-white" />
              )}
            </div>
          ))}
        </div>
      );
    };
    return (
      <div className="relative flex h-full">
        {/* Кнопка открытия (Плавающая). Показывается ТОЛЬКО когда закрыто */}
        {!isOpen && (
          <button
            onClick={onToggle}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-white border border-gray-200 border-l-0 p-2 rounded-r-xl shadow-lg hover:bg-blue-50 text-blue-600 transition-[width,opacity] animate-in slide-in-from-left duration-100 ease-out"
            title="Открыть структуру книги"
          >
            <ChevronRight size={20} strokeWidth={3} />
          </button>
        )}

        {/* Основной контейнер сайдбара */}
        <aside
          className={`
                relative flex flex-col border-r bg-white shadow-xl z-40 transition-all duration-300 ease-in-out
                ${isOpen ? "w-72 opacity-100" : "w-0 opacity-0 overflow-hidden "}
            `}
        >
          {/* Шапка с кнопкой закрытия */}
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center min-w-[288px]">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Структура
            </span>
            <button
              type="button"
              title="Структура"
              onClick={onToggle}
              className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
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
