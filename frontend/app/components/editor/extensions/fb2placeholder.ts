import { Node } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export const Fb2Placeholder = Node.create({
  name: 'fb2Placeholder',
  group: 'block',
  // Разрешаем контент, чтобы каретка могла войти внутрь
  content: 'inline*', 
  selectable: true,
  isolating: true,
  defining: true,

  renderHTML() {
    return [
      'p', 
      { 
        class: 'fb2-placeholder-anchor',
        // Мы НЕ ставим contenteditable: false здесь!
      }, 
      0
    ]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('fb2PlaceholderStall'),
        props: {
          // Блокируем ЛЮБОЙ ввод и удаление, оставляя только мигающую каретку
          handleKeyDown(view, event) {
            const { selection } = view.state;
            if (selection.$from.parent.type.name === 'fb2Placeholder') {
              const allowed = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab'];
              if (!allowed.includes(event.key)) {
                // Запрещаем печатать и стирать, каретка просто стоит на месте
                event.preventDefault();
                return true;
              }
            }
            return false;
          }
        }
      })
    ]
  }
});
