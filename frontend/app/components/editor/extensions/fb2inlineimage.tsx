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
      ...this.parent?.(),
      class: { default: "inline-block align-bottom mx-1 max-w-full h-auto" },
    };
  },
  addCommands(): any {
    return {
      canInsertFb2InlineImage:
        () =>
          ({ state }: CommandProps) => {
            return INLINE_ACTIVE_NODES.includes(state.selection.$from.parent.type.name);
          },
    };
  },

}).configure({ allowBase64: true });
