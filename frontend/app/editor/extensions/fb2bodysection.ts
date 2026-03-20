import { Node, mergeAttributes } from "@tiptap/core";

export const Fb2BodySection = Node.create({
  name: "fb2BodySection",
  group: "block",
  // Используем актуальные имена твоих узлов (blockImage)
  content: "fb2Placeholder fb2BlockImage? fb2Title? fb2Epigraph* fb2Section+",
  defining: true,
  selectable: true,
  isolating: true,

  addAttributes() {
    return {
      level: { default: 1 },
      sectionId: {
        default: null,
        // КЛЮЧЕВОЙ МОМЕНТ: Привязываем атрибут sectionId к HTML-атрибуту id
        parseHTML: element => element.getAttribute("id"),
        renderHTML: attributes => {
          if (!attributes.sectionId) return {};
          return { id: attributes.sectionId };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "section.fb2-body-section" }];
  },

  renderHTML({ HTMLAttributes }) {
    // Tiptap возьмет 'id' из renderHTML атрибутов выше и 
    // объединит его с классом здесь.
    return [
      "section",
      mergeAttributes(HTMLAttributes, { class: "fb2-body-section" }),
      0,
    ];
  },
});