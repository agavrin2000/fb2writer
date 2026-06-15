import React from "react";
import { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { NodeSelection } from "@tiptap/pm/state";
import { X, Download } from "lucide-react";

/**
 * Интерфейс свойств компонента всплывающего меню для изображений.
 */
interface ImageBubbleMenuProps {
  /**
   * Редактор Tiptap, который используется для управления содержимым документа.
   */
  editor: Editor | null;
}

/**
 * Компонент всплывающего меню (bubble menu), отображаемого при выделении изображения в редакторе.
 * Предоставляет пользователю информацию о картинке и действия:
 * - Показывает размеры изображения (ширина × высота) и его объём (в Кб или как URL).
 * - Кнопку для скачивания изображения.
 * - Кнопку для удаления изображения из документа.
 *
 * Меню появляется только при выделении блочных (`fb2BlockImage`) или встроенных (`fb2InlineImage`) изображений.
 * Автоматически обновляет информацию при изменении выбранного изображения.
 *
 * @component
 * @param props - Свойства компонента {@link ImageBubbleMenuProps}.
 *
 * @example
 * <ImageBubbleMenu editor={editor} />
 */
export const ImageBubbleMenu: React.FC<ImageBubbleMenuProps> = ({ editor }) => {
  const [info, setInfo] = React.useState<{
    size: string;
    w: number;
    h: number;
    src: string;
  } | null>(null);

  React.useEffect(() => {
    if (!editor) return;

    const updateInfo = () => {
      const { selection } = editor.state;

      // 1. Быстрая проверка: если это не картинка, сразу зануляем и выходим
      if (!(selection instanceof NodeSelection)) {
        setInfo(prev => prev === null ? null : null); // React оптимизирует повторный null
        return;
      }

      const node = selection.node;
      if (node.type.name !== "fb2InlineImage" && node.type.name !== "fb2BlockImage") {
        setInfo(null);
        return;
      }

      // 2. Извлекаем данные из атрибутов и DOM-узла
      const src = node.attrs.src || "";
      const dom = editor.view.nodeDOM(selection.from) as HTMLElement;
      const img = dom?.tagName === "IMG" ? (dom as HTMLImageElement) : dom?.querySelector("img");

      if (img) {
        const updateIfChanged = () => {
          const newSize = src.startsWith("data:")
            ? ((src.length * 0.75) / 1024).toFixed(1) + " Кб"
            : "URL";
          const newW = img.naturalWidth;
          const newH = img.naturalHeight;

          // 3. Оптимизация: обновляем состояние только при изменении данных
          setInfo(prev => {
            if (
              prev?.src === src &&
              prev?.size === newSize &&
              prev?.w === newW &&
              prev?.h === newH
            ) {
              return prev; // Избегаем лишних ререндеров
            }
            return { src, size: newSize, w: newW, h: newH };
          });
        };

        // Обрабатываем загруженное или уже кэшированное изображение
        if (img.complete) {
          updateIfChanged();
        } else {
          img.onload = updateIfChanged;
        }
      }
    };

    // Подписываемся на изменения выделения
    editor.on("selectionUpdate", updateInfo);

    return () => {
      editor.off("selectionUpdate", updateInfo);
    };
  }, [editor]); // editor обычно стабилен, цикл прекратится

  /**
   * Обработчик скачивания изображения.
   * Создаёт временный элемент `<a>` с атрибутом `download`, имитирует клик и удаляет элемент.
   */
  const handleDownload = () => {
    if (!info?.src) return;
    const link = document.createElement("a");
    link.href = info.src;
    link.download = `image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor }) =>
        editor.isActive("fb2InlineImage") || editor.isActive("fb2BlockImage")
      }
      updateDelay={0}
      // Прижимаем всё меню к правому верхнему углу картинки
      options={{
        placement: "top-start",
        offset: -25,
        flip: false,
      }}
    >
      <div className="flex flex-col items-end">
        {/* Контейнер-обертка, который будет иметь ту же ширину, что и выделенная картинка */}
        <div className="flex bg-ui-bg text-ui-text border border-gray-200 rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Плашка с информацией */}
          {info && (
            <div className="px-3 py-1.5 flex items-center text-[10px] whitespace-nowrap">
                {/* Информационная панель */}
                {info.w}×{info.h} px ({info.size})
            </div>
          )}
          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 hover:bg-ui-bg-hover border-l border-gray-200"
            title="Скачать"
          >
            <Download size={15} />
          </button>
          <button
            type="button"
            title="Удалить изображение"
            onClick={() => editor.chain().focus().deleteSelection().run()}
            className="p-1.5 bg-red-600 hover:bg-red-700 text-white"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </BubbleMenu>
  );
};
