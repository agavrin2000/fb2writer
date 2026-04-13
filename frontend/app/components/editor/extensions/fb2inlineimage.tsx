import Image from "@tiptap/extension-image";
import { CommandProps } from "@tiptap/core";

const INLINE_ACTIVE_NODES = [
  "paragraph",
  "fb2V",
  "fb2TextAuthor",
  "fb2Subtitle",
];

// Инлайновое изображение (для параграфов)
export const Fb2InlineImage = Image.extend({
  name: "fb2InlineImage", // Важно: другое имя!
  inline: true,
  group: "inline",
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: (element) => element.getAttribute("href"),
        renderHTML: (attributes) => ({ href: attributes.href }),
      },
      src: {
        // Tiptap Image требует src для отображения в редакторе,
        // но мы можем сделать его опциональным в JSON
        parseHTML: (element) => element.getAttribute("src"),
        renderHTML: (attributes) => ({ src: attributes.src }),
      },
      class: { default: "inline-block align-bottom mx-1 max-w-full h-auto" },
    };
  },
  addCommands() {
    return {
      insertFb2InlineImage:
        (attributes: { src: string, href?: string }) => // Принимаем данные изображения
          ({ state, dispatch, chain }: CommandProps) => {
            // 1. Логика проверки (Dry Run)
            const canInsert = INLINE_ACTIVE_NODES.includes(
              state.selection.$from.parent.type.name
            );

            if (!canInsert) return false;

            // 2. Логика выполнения (если это не Dry Run, а реальный вызов)
            // attributes передаются при вызове: editor.commands.insertFb2InlineImage({ src: '...' })
            if (dispatch && attributes) {
              return chain()
                .insertContent({
                  type: "fb2InlineImage",
                  attrs: attributes,
                })
                .focus()
                .run();
            }
            return true;
          },
    };
  },
}).configure({ allowBase64: true });
