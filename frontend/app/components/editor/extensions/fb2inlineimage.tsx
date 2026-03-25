import Image from "@tiptap/extension-image";

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
  }
}).configure({ allowBase64: true });
