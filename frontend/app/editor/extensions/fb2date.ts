import { Node, mergeAttributes } from "@tiptap/core";
import { CommandProps } from "@tiptap/core";

export const Fb2Date = Node.create({
  name: "fb2Date",
  group: "block",
  content: "inline*",
  defining: true, 
  selectable: true,
    addAttributes() {
        return {
            value: {
                default: (new Date).toISOString().split('T')[0],
                keepAttributes: true,
            },
        }
    },
  parseHTML: () => [{ tag: "p.date" }, { tag: "date" }],
  renderHTML: ({ HTMLAttributes }) => [
    "p",
    mergeAttributes(HTMLAttributes, { class: "fb2-date" }),
    0,
  ],

  addCommands(): any {
    return {
      insertFb2Date:
        () =>
        ({ state, chain }: CommandProps) => {

        },
      removeFb2Date:
        () =>
        ({ state, chain }: CommandProps) => {
          
        },
    };
  },
});
