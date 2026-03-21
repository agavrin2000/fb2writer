"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { TocItem } from "../../types/types";
import { ChevronRight, ChevronLeft } from "lucide-react";

export const Sidebar = ({
  tree,
  activePos,
  editor,
}: {
  tree: TocItem[];
  activePos: number | null;
  editor: any;
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // Функция для переключения (можно вызвать горячей клавишей Alt+B)
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    // Следим за закрытием сайдбара
  useEffect(() => {
    if (!isSidebarOpen && editor) {
      // Возвращаем фокус в редактор после закрытия
      // setTimeout нужен, чтобы дождаться начала анимации скрытия и пересчета фокуса
      setTimeout(() => {
        editor.commands.focus();
      }, 50);
    }
  }, [isSidebarOpen, editor]);

  // Добавляем слушатель горячих клавиш
  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      // Проверяем Alt + клавиша B (KeyB сработает и на русской раскладке)
      if (event.altKey && event.code === "KeyB") {
        event.preventDefault();
        //event.stopImmediatePropagation(); // Дополнительная защита от перехвата

        // Используем функциональный апдейт, чтобы не зависеть от замыкания
        setIsSidebarOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []); // Пустой массив зависимостей, так как toggleSidebar использует функциональное обновление

const scrollToHeading = (sectionId: string, pos: number) => {
    if (!editor || !sectionId) return;

    editor.chain().focus().setTextSelection(pos).run();

    let attempts = 0;
    const maxAttempts = 15;

    const stabilize = () => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({
                behavior: attempts === 0 ? 'smooth' : 'auto',
                block: 'start'
            });

            if (attempts < maxAttempts) {
                attempts++;
                setTimeout(stabilize, 100);
            }
        }
    };

    requestAnimationFrame(stabilize);
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
              onClick={() => {scrollToHeading(item.id, item.pos);  editor?.commands.focus();}}
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
      {!isSidebarOpen && (
        <button
          onClick={toggleSidebar}
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
                ${isSidebarOpen ? "w-72 opacity-100" : "w-0 opacity-0 overflow-hidden "}
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
            onClick={toggleSidebar}
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
};
