/**
 * @fileoverview Компонент верхнего меню приложения — строка заголовка с выпадающими пунктами: Файл, Правка, Справка.
 * Обеспечивает навигацию по основным функциям редактора и отображает название программы.
 */

"use client";
import { useEffect, useState, useRef, useCallback, memo } from "react";
import { Editor } from "@tiptap/react";
import { Info, LogOut, Save, FolderOpen, Undo, Redo, FileCode, FilePlus } from "lucide-react";
import { photino } from "@/services/photino";
import { AboutModal } from "./AboutModal";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/**
 * Интерфейс свойств компонента шапки приложения.
 */
interface HeaderProps {
  /**
   * Экземпляр редактора TipTap. Может быть `null`, если редактор ещё не инициализирован.
   */
  editor: Editor | null;

  /**
   * Обработчик сохранения файла.
   * @param saveAs - Если `true`, вызывается диалог "Сохранить как...".
   */
  onSave: (saveAs: boolean) => void;

  /**
   * Обработчик открытия файла.
   */
  onOpen: () => void;

  /**
   * Обработчик создания нового документа.
   */
  onNew: () => void;

  /**
   * Имя текущего файла (отображается в интерфейсе, например, "document.fb2").
   * Используется для активации/деактивации кнопки "Сохранить".
   */
  fileName: string;
}

/**
 * Компонент строки меню приложения.
 * Содержит три выпадающих меню:
 * - **Файл**: Новый, Открыть, Сохранить, Сохранить как..., Выход.
 * - **Правка**: Отменить, Повторить.
 * - **Справка**: О программе.
 *
 * Поддерживает:
 * - Открытие/закрытие меню по клику.
 * - Автоматическое закрытие при клике вне области меню.
 * - Блокировку недоступных действий (например, "Отменить", если нет истории).
 * - Отображение подсказок с сочетаниями клавиш.
 * - Центрированное отображение названия приложения.
 *
 * Использует `React.memo` для оптимизации перерисовки при неизменных пропсах.
 *
 * @component
 * @param props - Входные параметры компонента {@link HeaderProps}.
 *
 * @example
 * <Header
 *   editor={editor}
 *   onSave={handleSave}
 *   onOpen={handleOpen}
 *   onNew={handleNew}
 *   fileName="mybook.fb2"
 * />
 */
export const Header = memo(
  ({
    editor,
    onSave,
    onOpen,
    onNew,
    fileName,
  }: HeaderProps) => {
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [isAboutOpen, setIsAboutOpen] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);

    // Закрытие меню при клике вне
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          menuRef.current &&
          !menuRef.current.contains(event.target as Node)
        ) {
          setActiveMenu(null);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Выполнение дейстаия и скрытие меню при выборе пункта меню
    const handleAction = useCallback(
      (action: () => void) => {
        action();
        setActiveMenu(null);
      },
      [setActiveMenu],
    );

    return (
      <>
        <header className="h-9 border-b flex items-center px-2 z-50 shadow-sm select-none">
          <div className="flex items-center gap-1" ref={menuRef}>
            {/* РАЗДЕЛ: ФАЙЛ */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActiveMenu(activeMenu === "file" ? null : "file")
                }
                className={`header-menu-btn ${activeMenu === "file" ? "header-menu-btn-active" : ""}`}
              >
                Файл
              </button>
              {activeMenu === "file" && (
                <div className="header-dropdown">
                  <button
                    type="button"
                    onClick={() => handleAction(onNew)}
                    className="header-item"
                  >
                    <span className="flex items-center gap-2">
                      <FilePlus size={14} /> Новый
                    </span>
                    <span className="text-[10px] opacity-50">Ctrl+N</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(onOpen)}
                    className="header-item"
                  >
                    <span className="flex items-center gap-2">
                      <FolderOpen size={14} /> Открыть...
                    </span>
                    <span className="text-[10px] opacity-50">Ctrl+O</span>
                  </button>
                  <button
                    type="button"
                    disabled={!fileName}
                    onClick={() => handleAction(() => onSave(false))}
                    className="header-item"
                  >
                    <span className="flex items-center gap-2">
                      <Save size={14} /> Сохранить
                    </span>
                    <span className="text-[10px] opacity-50">Ctrl+S</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(() => onSave(true))}
                    className="header-item"
                  >
                    <span className="flex items-center gap-2">
                      <FileCode size={14} /> Сохранить как...
                    </span>
                    <span className="text-[10px] opacity-50">Ctrl+Shift+S</span>
                  </button>
                  <div className="border-t my-1"></div>
                  <button
                    type="button"
                    onClick={() => handleAction(() => photino.send("show-exit-confirmation"))}
                    className="header-item text-red-600"
                  >
                    <span className="flex items-center gap-2">
                      <LogOut size={14} /> Выход
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* РАЗДЕЛ: ПРАВКА */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActiveMenu(activeMenu === "edit" ? null : "edit")
                }
                className={`header-menu-btn ${activeMenu === "edit" ? "header-menu-btn-active" : ""}`}
              >
                Правка
              </button>
              {activeMenu === "edit" && (
                <div className="header-dropdown">
                  <button
                    type="button"
                    disabled={!editor?.can().undo()}
                    onClick={() =>
                      handleAction(() => editor?.commands.undo())
                    }
                    className="header-item"
                  >
                    <span className="flex items-center gap-2">
                      <Undo size={14} /> Отменить
                    </span>
                    <span className="text-[10px] opacity-50">Ctrl+Z</span>
                  </button>
                  <button
                    type="button"
                    disabled={!editor?.can().redo()}
                    onClick={() => handleAction(() => editor?.chain().focus().redo().run())}
                    className="header-item"
                  >
                    <span className="flex items-center gap-2">
                      <Redo size={14} /> Повторить
                    </span>
                    <span className="text-[10px] opacity-50">Ctrl+Y</span>
                  </button>
                </div>
              )}
            </div>

            {/* РАЗДЕЛ: СПРАВКА */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActiveMenu(activeMenu === "help" ? null : "help")
                }
                className={`header-menu-btn ${activeMenu === "help" ? "header-menu-btn-active" : ""}`}
              >
                Справка
              </button>
              {activeMenu === "help" && (
                <div className="header-dropdown">
                  <button
                    type="button"
                    onClick={() => handleAction(() => setIsAboutOpen(true))}
                    className="header-item"
                  >
                    <span className="flex items-center gap-2">
                      <Info size={14} /> О программе
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Центрированное название приложения */}
          <div className="flex-grow text-center text-[10px] font-black text-gray-300 tracking-[0.4em] uppercase truncate px-4">
            FB2 Writer
          </div>
          <ThemeToggle />
        </header >

        {/* Модальное окно "О программе" */}
        < AboutModal
          isOpen={isAboutOpen}
          onClose={() => setIsAboutOpen(false)}
        />
      </>
    );
  },
);

Header.displayName = "Header";