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

/**
 * Интерфейс свойств компонента контекстного меню секции FB2.
 */
interface Props {
  /**
   * Экземпляр редактора TipTap. Может быть `null`, если редактор ещё не инициализирован.
   */
  editor: Editor | null;

  /**
   * Обработчик выбора типа вставляемого изображения.
   * Вызывается при клике на кнопку добавления картинки к секции.
   * @param type - Тип изображения: `"section"` — изображение заголовка секции (виньетка).
   */
  onSelectImage: (type: "block" | "inline" | "section") => void;
}

/**
 * Компонент всплывающего контекстного меню для управления элементом `fb2Section`.
 * Отображается рядом с секцией при её выделении через специальный маркер (`.section-handle`).
 * Позволяет:
 * - Просматривать и редактировать `elementId` секции.
 * - Управлять вложенностью: добавлять подразделы или разделы ниже.
 * - Добавлять/удалять внутренние элементы: заголовок, эпиграф, аннотацию.
 * - Вставлять виньетку (изображение секции).
 *
 * Особенности:
 * - Использует `@floating-ui/react` для позиционирования меню относительно маркера секции.
 * - Автоматически открывается при выделении секции и закрывается при клике вне его.
 * - Поддерживает анимацию появления через `FloatingPortal`.
 * - Реагирует на прокрутку страницы благодаря `autoUpdate`.
 *
 * @component
 * @param props - Входные параметры компонента {@link Props}.
 *
 * @example
 * <Fb2SectionMenu editor={editor} onSelectImage={handleSelectImage} />
 */
export const Fb2SectionMenu = ({ editor, onSelectImage }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const isTyping = useRef(false);

  // Настройка позиционирования всплывающего меню
  const { refs, floatingStyles, update } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "right-start",
    middleware: [offset({ mainAxis: 10, crossAxis: 0 }), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const selection = editor?.state.selection;
  const isSection =
    selection instanceof NodeSelection &&
    selection.node.type.name === "fb2Section";
  const currentLevel = isSection ? selection.node.attrs.level || 1 : 1;
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

  // Обновление видимости и позиции меню при изменении выделения
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
      if (!refs.floating.current) return;

      const target = event.target as HTMLElement;
      if (
        !refs.floating.current.contains(target) ) {
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

  // Проверка возможности удаления внутренних элементов
  const canRemoveTitle = editor.can().removeFb2Title();
  const canRemoveAnnotation = editor.can().removeFb2Annotation();
  const canRemoveSection = editor.can().removeFb2Section();

  /**
   * Вставляет новую секцию в указанную позицию относительно текущей.
   * @param position - Позиция вставки: `"after"` — после, `"start"` — в начало, `"end"` — в конец.
   */
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
        /* Заменил bg на ui-bg, добавил переменную тени и стандартную границу */
        className="z-[9999] flex flex-col border border-[var(--color-ui-border)] bg-[var(--color-ui-bg)] rounded-lg shadow-[var(--shadow-dropdown)] p-1 gap-1 animate-in fade-in slide-in-from-left-2 duration-150"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Индикатор уровня вложенности */}
        <div
          className="flex items-center justify-center gap-1 py-1.5 mb-1 rounded-t-md"
          title={`Уровень вложенности: ${currentLevel}`}
        >
          {/* Цвет иконки и текста теперь из темы (muted) */}
          <Layers size={12} className="text-[var(--color-ui-text-muted)]" />
          <span className="text-[11px] text-[var(--color-ui-text)] leading-none font-medium">
            {currentLevel}
          </span>
        </div>

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

        {/* Группа: Структура секций */}
        <div className="flex flex-col border-b gap-1">
          <button
            type="button"
            onClick={() => addFb2Section("after")}
            className={cn("toolbar-btn", "toolbar-btn-default")}
            title="Добавить раздел ниже"
          >
            <Fb2ActionIcon icon={Rows2} mode="add" />
          </button>
          <button
            type="button"
            onClick={() => addFb2Section("start")}
            className={cn("toolbar-btn", "toolbar-btn-default")}
            title="Подраздел в начало"
          >
            <ListStart size={16} />
          </button>
          <button
            type="button"
            onClick={() => addFb2Section("end")}
            className={cn("toolbar-btn", "toolbar-btn-default")}
            title="Подраздел в конец"
          >
            <ListEnd size={16} />
          </button>

          {/* Удаление раздела */}
          <button
            type="button"
            disabled={!canRemoveSection}
            onClick={() => editor.chain().focus().removeFb2Section().run()}
            className={cn("toolbar-btn", "toolbar-btn-default")}
            title="Удалить всю секцию"
          >
            <Fb2ActionIcon icon={Rows2} mode="remove" />
          </button>
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
            className={cn("toolbar-btn", "toolbar-btn-default")}
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
            className={cn("toolbar-btn", "toolbar-btn-default")}
            title="Добавить эпиграф"
          >
            <Fb2ActionIcon icon={TextQuote} mode="add" />
          </button>

          <button
            type="button"
            onClick={() => onSelectImage("section")}
            className={cn("toolbar-btn", "toolbar-btn-default")}
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
            className={cn("toolbar-btn", "toolbar-btn-default")}
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
