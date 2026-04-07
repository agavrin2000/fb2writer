import Paragraph from '@tiptap/extension-paragraph'

export const Fb2Paragraph = Paragraph.extend({
  addAttributes() {
    return {
      // Добавляем атрибут id
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
        style: {
        default: null,
        // Отрисовка в HTML: добавляем атрибут id к тегу <p>
        renderHTML: attributes => {
          if (!attributes.style) {
            return {}
          }
          return { id: attributes.style }
        },
        // Парсинг из HTML: ищем атрибут style в теге <p>
        parseHTML: element => element.getAttribute('style'),
      },
    }
  },
})