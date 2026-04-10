import React from "react";
import { Image, ImageDown, PanelTop, ChevronDown } from "lucide-react";

/**
 * Расширение команд TipTap для работы с изображениями в формате FB2.
 * Добавляет пользовательские проверки возможности вставки блочных и встроенных изображений.
 */

// 1. Описываем типы для TypeScript
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fb2Commands: {
      /**
       * Проверяет, можно ли вставить блочное изображение (`fb2BlockImage`) в текущую позицию.
       * @returns `true`, если вставка разрешена; `false` — если нет.
       */
      canAddfb2BlockImage: () => ReturnType;
      /**
 * Проверяет, можно ли вставить встроенное изображение (`fb2InlineImage`) в текущий узел.
 * Разрешает вставку только внутри определённых типов узлов (например, абзац, строка стиха).
 * @returns `true`, если вставка разрешена; `false` — если нет.
 */
      canAddfb2InlineImage: () => ReturnType;
    };
  }
}

/**
 * Компонент выпадающего меню для выбора типа вставляемого изображения.
 * Предоставляет три варианта:
 * - **Блочное** — изображение как отдельный блок между абзацами.
 * - **В тексте** — встроенное изображение внутри строки текста.
 * - **В заголовок секции** — виньетка перед заголовком раздела.
 *
 * Каждый пункт может быть заблокирован в зависимости от контекста редактирования.
 * Меню закрывается при клике вне его области.
 *
 * @component
 * @param onSelect - Функция обратного вызова, вызываемая при выборе типа изображения.
 * @param canInlineImage - Флаг доступности вставки встроенного изображения.
 * @param canBlockImage - Флаг доступности вставки блочного изображения.
 * @param canSectionImage - Флаг доступности вставки изображения в заголовок секции.
 *
 * @example
 * <ImageDropdown
 *   onSelect={(type) => console.log("Выбран тип:", type)}
 *   canInlineImage={true}
 *   canBlockImage={false}
 *   canSectionImage={true}
 * />
 */
export const ImageDropdown: React.FC<{
  /**
 * Обработчик выбора типа изображения.
 * @param type - Тип выбранного изображения: `"block"`, `"inline"` или `"section"`.
 */
  onSelect: (type: "block" | "inline" | "section") => void;
  /**
  * Доступность вставки встроенного изображения.
  */
  canInlineImage: boolean;
  /**
     * Доступность вставки блочного изображения.
     */
  canBlockImage: boolean;
  /**
   * Доступность вставки изображения в заголовок секции.
   */
  canSectionImage: boolean;
}> = ({ onSelect, canInlineImage, canBlockImage, canSectionImage }) => {
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

  // Общий стиль для пунктов меню
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
            disabled={!canBlockImage}
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
            disabled={!canInlineImage}
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
            disabled={!canSectionImage}
            onClick={() => {
              onSelect("section");
              setIsOpen(false);
            }}
            onMouseDown={(e) => e.preventDefault()}
            className={itemClass}
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
