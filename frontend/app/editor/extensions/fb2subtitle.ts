import { Node, mergeAttributes } from "@tiptap/core";
import { CommandProps } from "@tiptap/core";

export const Fb2Subtitle = Node.create({
  name: "fb2Subtitle",
  group: "block",
  content: "inline*",
  defining: true, // Важно: сохраняет узел при вставке контента или нажатии Enter
  selectable: true,
  parseHTML: () => [{ tag: "p.subtitle" }, { tag: "subtitle" }],
  renderHTML: ({ HTMLAttributes }) => [
    "p",
    mergeAttributes(HTMLAttributes, { class: "fb2-subtitle" }),
    0,
  ],

  addCommands(): any {
    return {
      insertFb2Subtitle:
        () =>
        ({ state, chain }: CommandProps) => {
          const { $from } = state.selection;

          // 1. Проверяем запрещенные контексты
          // Идем вверх по дереву и смотрим, нет ли среди родителей "плохих" узлов
          const isRestricted = (depth: number) => {
            const name = $from.node(depth).type.name;
            return ["fb2Title", "fb2Epigraph", "fb2Subtitle"].includes(name);
          };

          for (let d = $from.depth; d > 0; d--) {
            if (isRestricted(d)) return false; // Команда недоступна
          }

          // 2. Проверяем, что мы вообще внутри секции
          let sectionDepth = -1;
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === "fb2Section") {
              sectionDepth = d;
              break;
            }
          }

          if (sectionDepth === -1) return false;

          // 3. Выполняем вставку
          // Вставляем сразу после текущего блока (например, после параграфа, где стоит курсор)
          return chain()
            .insertContent({
              type: "fb2Subtitle",
              content: [
                {
                  type: "text", text: "Новый подзаголовок" 
                },
              ],
            })
            .focus()
            .run();
        },
      removeFb2Subtitle:
        () =>
        ({ state, chain }: CommandProps) => {
          const { $from } = state.selection;
          let subtitleDepth = -1;

          // 1. Ищем, находимся ли мы внутри fb2Subtitle
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === "fb2Subtitle") {
              subtitleDepth = d;
              break;
            }
          }

          // Если не нашли — команда недоступна (кнопка в UI будет неактивна)
          if (subtitleDepth === -1) {
            return false;
          }

          // 2. Определяем границы узла
          const from = $from.before(subtitleDepth);
          const to = $from.after(subtitleDepth);

          // 3. Удаляем узел и возвращаем фокус
          return chain().deleteRange({ from, to }).focus().run();
        },
    };
  },
});
