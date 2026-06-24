import Image from "@tiptap/extension-image";
import { CommandProps } from "@tiptap/core";

const INLINE_ACTIVE_NODES = [
  "paragraph",
  "fb2V",
  "fb2TextAuthor",
  "fb2Subtitle",
  "tableHeader",
  "tableCell",
];

// Инлайновое изображение (для параграфов)
export const Fb2InlineImage = Image.extend({
  name: "fb2InlineImage",
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
        parseHTML: (element) => element.getAttribute("src"),
        renderHTML: (attributes) => ({ src: attributes.src }),
      },
      class: { default: "fb2-inline-image" },
    };
  },
  addCommands() {
    return {
      insertFb2InlineImage:
        (attributes: { src: string, href?: string }) => // Принимаем данные изображения
          ({ state, dispatch, chain }: CommandProps) => {
            const canInsert = INLINE_ACTIVE_NODES.includes(
              state.selection.$from.parent.type.name
            );

            if (!canInsert) return false;

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
