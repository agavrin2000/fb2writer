import React, { useState, useEffect, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { isNodeSelection } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  FloatingPortal,
} from "@floating-ui/react";
import { Trash2, ListPlus, ListStart, ListEnd } from "lucide-react";

interface Props {
  editor: Editor | null;
}

export const Fb2SectionMenu = ({ editor }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  // Настройка Floating UI
  const { refs, floatingStyles, update } = useFloating({
    open: isOpen,
    placement: "right-start",
    middleware: [offset({ mainAxis: 10, crossAxis: 0 }), flip(), shift()],
    whileElementsMounted: autoUpdate, // Авто-обновление при скролле (важно для sticky!)
  });

  type InsertPosition = "after" | "start" | "end";

  // Следим за выделением в редакторе
  useEffect(() => {
    if (!editor) return;

    const updateMenu = () => {
      const { selection } = editor.state;

      // Показываем меню только если выделена fb2Section
      const isSectionSelected =
        selection instanceof NodeSelection &&
        selection.node.type.name === "fb2Section";

      if (isSectionSelected) {
        // Находим DOM-узел секции
        const dom = editor.view.nodeDOM(selection.from) as HTMLElement;
        const handle = dom?.querySelector(".section-handle");

        if (handle) {
          // Устанавливаем ручку как виртуальный элемент для позиционирования
          refs.setPositionReference({
            getBoundingClientRect: () => handle.getBoundingClientRect(),
          });
          setIsOpen(true);
        }
      } else {
        setIsOpen(false);
      }
    };

      // ФУНКЦИЯ ЗАКРЫТИЯ ПРИ КЛИКЕ МИМО
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    
    // Проверяем: клик НЕ по меню и НЕ по ручке ⠿
    const isClickInsideMenu = refs.floating.current?.contains(target);
    const isClickOnHandle = target.closest('.section-handle');

    if (isOpen && !isClickInsideMenu && !isClickOnHandle) {
      // Снимаем NodeSelection в редакторе (это скроет меню через updateMenu)
      editor.commands.setNodeSelection(0); // Или просто focus() для сброса выделения ноды
      editor.commands.focus();
      setIsOpen(false);
    }
  };

    editor.on("selectionUpdate", updateMenu);
    editor.on("focus", updateMenu);
    // Добавляем слежение за скроллом самого редактора для мгновенной реакции
    window.addEventListener("scroll", update, true);
    // Добавляем слушатель клика
  window.addEventListener("mousedown", handleClickOutside);

    return () => {
      editor.off("selectionUpdate", updateMenu);
      editor.off("focus", updateMenu);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editor, refs, update, isOpen]);

  if (!isOpen || !editor) return null;
  const addFb2Section = (position: InsertPosition) => {
    const { selection } = editor.state;

    if (
      isNodeSelection(selection) &&
      selection.node.type.name === "fb2Section"
    ) {
      const node = selection.node;
      const currentLevel = node.attrs.level || 1;

      let insertPos: number;
      let targetLevel: number;

      // Определяем логику позиции и уровня
      switch (position) {
        case "after":
          insertPos = selection.to;
          targetLevel = currentLevel; // Тот же уровень
          break;
        case "start":
          insertPos = selection.from + 1;
          targetLevel = currentLevel + 1; // Уровень глубже
          break;
        case "end":
          insertPos = selection.to - 1;
          targetLevel = currentLevel + 1; // Уровень глубже
          break;
        default:
          return;
      }
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
            {
              type: "paragraph",
              content: [{ type: "text", text: "Текст нового раздела" }],
            },
          ],
        })
        .run();
    }
  };

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        style={floatingStyles}
        className="z-[9999] flex bg-white border border-gray-200 rounded-lg shadow-xl p-1 gap-1 items-center animate-in fade-in zoom-in duration-150"
      >
        <button
          onClick={() => addFb2Section("after")}
          style={btnStyle}
          title="Добавить раздел"
        >
          <ListPlus size={14} />
        </button>

        {/* Создание подсекции в начале */}
        <button
          onClick={() => addFb2Section("start")}
          style={btnStyle}
          title="Вставить подраздел в начало"
        >
          <ListStart size={14} />
        </button>

        {/* Создание подсекции в конце */}
        <button
          onClick={() => addFb2Section("end")}
          style={btnStyle}
          title="Вставить подраздел в конец"
        >
          <ListEnd size={14} />
        </button>

        {/* Кнопка удаления */}
        <button
          onClick={() => editor.commands.deleteSelection()}
          style={{ ...btnStyle, color: "#ef4444" }}
          title="Удалить раздел"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </FloatingPortal>
  );
};

// Стили тулбара
const toolbarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "4px",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
  gap: "2px",
};

const btnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: "6px 10px",
  cursor: "pointer",
  borderRadius: "4px",
  fontSize: "14px",
  display: "flex",
  alignItems: "center",
  transition: "background 0.2s",
};

const separatorStyle: React.CSSProperties = {
  width: "1px",
  height: "20px",
  backgroundColor: "#e2e8f0",
  margin: "0 4px",
};
