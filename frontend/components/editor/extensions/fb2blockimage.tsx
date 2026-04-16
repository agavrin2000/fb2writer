import Image from "@tiptap/extension-image";
import { CommandProps } from "@tiptap/core";
import { findParentNodeByType } from "../../../utils/utils";
import { NodeSelection } from "@tiptap/pm/state";


// Блочное изображение (для структуры FB2)
export const Fb2BlockImage = Image.extend({
  name: "fb2BlockImage",
  inline: false,
  group: "block",
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: {
        // Tiptap Image требует src для отображения в редакторе,
        // но мы можем сделать его опциональным в JSON
        parseHTML: (element) => element.getAttribute("src"),
        renderHTML: (attributes) => ({ src: attributes.src }),
      },
      title: {
        default: "",
        parseHTML: (element) => element.getAttribute("title"),
        renderHTML: (attributes) => ({ title: attributes.title }),
      },
      href: {
        parseHTML: (element) => element.getAttribute("href"),
        renderHTML: (attributes) => ({ href: attributes.href }),
      },
      id: {
        default: null,
        // Отрисовка в HTML: добавляем атрибут id к тегу <p>
        renderHTML: attributes => {
          if (!attributes.id) {
            return {}
          }
          return { id: attributes.id }
        },
        // Парсинг из HTML: ищем атрибут id в теге <p>
        parseHTML: element => element.getAttribute('id'),
      },
      class: { default: "fb2-block-image" },
    };
  },
  addCommands() {
    return {
      insertFb2BlockImage:
        (attributes: { src: string, href?: string, title?: string }) => // Принимаем данные изображения
          ({ state, dispatch, chain }: CommandProps) => {
            const { selection } = state;

            // 1. Проверяем: выделена ли сама секция?
            if (selection instanceof NodeSelection && selection.node.type.name === "fb2Section") return false;

            const { pos: parentPos} = findParentNodeByType(
              selection,
              ["fb2Section"],
            );
            if (parentPos !== -1) return false;

            if (dispatch && attributes) {
              return chain()
                .insertContent({
                  type: "fb2BlockImage",
                  attrs: { src: attributes.src, href: attributes.href, title: attributes.title },
                })
                .focus()
                .run();
            }
            return true;
          },
      insertFb2SectionImage:
        (attributes: { src: string, href?: string, title?: string }) => // Принимаем данные изображения
          ({ state, dispatch, chain }: CommandProps) => {
            const { selection } = state;

            let sectionNode = null;
            let sectionPos = -1;

            // 1. Проверяем: выделена ли сама секция?
            if (selection instanceof NodeSelection && selection.node.type.name === "fb2Section") {
              sectionPos = selection.from;
              sectionNode = selection.node;
            }
            // 2. Если нет — ищем родительскую секцию вверх по дереву
            else {
              ({ node: sectionNode, pos: sectionPos } = findParentNodeByType(
                selection,
                ["fb2BodySection", "fb2Section"],
              ));
            }

            if (sectionPos === -1 || sectionNode == null) return false;

            // 2. Определяем позицию вставки внутри найденной секции
            let insertRelativePos = 0;

            // Определяем позицию возможной вставки
            if (sectionNode.type.name === "fb2BodySection") {
              insertRelativePos = sectionNode.child(0).nodeSize; // Для fb2BodySection вставка всегда в начало после placeholder
            }
            else {
              // Для секции - после заголовков и эпиграфов
              for (let i = 0; i < sectionNode.content.childCount; i++) {
                const child = sectionNode.content.child(i);
                if (child.type.name === "fb2Title" || child.type.name === "fb2Epigraph") {
                  insertRelativePos += child.nodeSize;
                } else {
                  // Как только встретили что-то другое (например, параграф) — выходим
                  break;
                }
              }
            }

            // Если на этой позиции уже есть изображение, запрещаем вставку
            // 1. Получаем результат поиска узла
            const result = sectionNode.childAfter(insertRelativePos);

            // 2. ПРИСТРАСТНАЯ ПРОВЕРКА:
            // Нам нужно, чтобы узел существовал (node), 
            // чтобы он начинался РОВНО в insertRelativePos (offset === insertRelativePos)
            // и чтобы это была именно картинка.
            if (
              result.node &&
              result.node.type.name === "fb2BlockImage"
            ) {
              return false; // Запрещаем вставку: картинка уже ровно здесь
            }

            if (dispatch && attributes) {
              const absoluteInsertPos = sectionPos + 1 + insertRelativePos;
              return chain()
                .insertContentAt(absoluteInsertPos, {
                  type: "fb2BlockImage",
                  attrs: { src: attributes.src, href: attributes.href, title: attributes.title },
                })
                .focus()
                .run();
            }

            return true;
          },
    };
  },
}).configure({ allowBase64: true });
