import Paragraph from '@tiptap/extension-paragraph'

export const TitleParagraph = Paragraph.extend({
  name: 'titleParagraph', // Уникальное имя для схемы
  marks: '', // ПУСТАЯ СТРОКА запрещает все стандартные и кастомные метки
})