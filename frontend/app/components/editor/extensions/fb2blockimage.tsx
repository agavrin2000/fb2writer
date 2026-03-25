import Image from "@tiptap/extension-image";
import { CommandProps } from "@tiptap/core";

const FORBIDDEN_FB2_IMAGE_PARENTS = [
  "fb2Epigraph",
  "fb2Subtitle",
  "fb2Title",
  "fb2Annotation",
  "fb2Poem",
  "fb2Cite",
];

// Блочное изображение (для структуры FB2)
export const Fb2BlockImage = Image.extend({
  name: "fb2BlockImage",
  inline: false,
  group: "block",
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      ...this.parent?.(),
      href: {
        default: null,
        parseHTML: (element) => element.getAttribute("elementId"),
        renderHTML: (attributes) => ({ href: attributes.href }),
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute("title"),
        renderHTML: (attributes) => ({ title: attributes.title }),
      },
      class: { default: "block mx-auto my-4 rounded-lg shadow-md max-w-full" },
    };
  },
  addCommands(): any {
    return {
      canAddfb2BlockImage:
        () =>
        ({ state }: CommandProps) => {
          const { $from } = state.selection;
            console.log("Node name:",state.selection)

          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            const nodeName = node.type.name;
            console.log("Node name:",nodeName)
            if (FORBIDDEN_FB2_IMAGE_PARENTS.includes(nodeName)) return false;
            else if (nodeName === "fb2Section" || nodeName === "fb2BodySection")
              return true;
          }
          return false;
        },
    };
  },
}).configure({ allowBase64: true });
