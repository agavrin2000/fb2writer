import { mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import Link from "@tiptap/extension-link";
import { Fb2BodySection } from "./extensions/fb2bodysection";
import { Fb2Section } from "./extensions/fb2section";
import { Fb2Title } from "./extensions/fb2title";
import { Fb2Cite } from "./extensions/fb2cite";
import { Fb2CustomStyle } from "./extensions/fb2customstyle";
import { Fb2Epigraph } from "./extensions/fb2epigraph";
import { Fb2Poem } from "./extensions/fb2poem";
import { Fb2Stanza } from "./extensions/fb2stanza";
import { Fb2Subtitle } from "./extensions/fb2subtitle";
import { Fb2TextAuthor } from "./extensions/fb2textauthor";
import { Fb2V } from "./extensions/fb2v";
import { Fb2Date } from "./extensions/fb2date";
import { Fb2BlockImage } from "./extensions/fb2blockimage";
import { Fb2InlineImage } from "./extensions/fb2inlineimage";
import { Fb2Placeholder } from "./extensions/fb2placeholder";
import { Fb2Annotation } from "./extensions/fb2annotation";
import { Fb2Paragraph } from "./extensions/fb2paragraph";
import Document from '@tiptap/extension-document'

const CustomDocument = Document.extend({
  // Запрещаем любые блоки, кроме вашей основной секции
  // Если у вас несколько корневых секций, перечислите их: 'fb2BodySection | fb2OtherSection'
  content: 'fb2BodySection', 
});

export const EditorExtensions = [
  StarterKit.configure({
    gapcursor: false,
    link: false,
    document: false, 
    paragraph: false,
    // Заголовки разных уровней
    heading: { levels: [1, 2, 3, 4] },
    // Настройка цитат
    blockquote: {
      HTMLAttributes: {
        class: "border-l-4 border-gray-300 pl-4 italic my-4",
      },
    },
    // Настройка встроенного кода
    code: {
      HTMLAttributes: {
        class: "bg-gray-100 rounded px-1 py-0.5 font-mono text-sm",
      },
    },
    //link: false,
  }),
  CustomDocument,
  Superscript, // Верхний индекс <sup>
  Subscript, // Нижний индекс <sub>
  Link.extend({
    // Переопределяем рендер
    renderHTML({ HTMLAttributes }) {
      return [
        "span",
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          class: "fb2-footnote",
          target: null,
        }),
        0,
      ];
    },
  }).configure({
    // Добавляем настройки здесь
    openOnClick: false,
    HTMLAttributes: {
      rel: "noopener noreferrer",
    },
    validate: (href) => /^https?:\/\/|^\#/.test(href),
  }),
  Fb2Paragraph,
  Fb2InlineImage,
  Fb2BlockImage,
  Fb2Section,
  Fb2BodySection,
  Fb2Title,
  Fb2Cite,
  Fb2CustomStyle,
  Fb2TextAuthor,
  Fb2Date,
  Fb2Epigraph,
  Fb2V,
  Fb2Stanza,
  Fb2Poem,
  Fb2Subtitle,
  Fb2Placeholder,
  Fb2Annotation,
];
