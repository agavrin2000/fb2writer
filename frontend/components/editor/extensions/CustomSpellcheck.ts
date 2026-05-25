import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { NSpell } from 'nspell'; // Импортируем именно тип для корректной типизации

export interface SpellcheckOptions {
  spellchecker: NSpell | null;
  exceptions: Set<string>;
}

export const CustomSpellcheck = Extension.create<SpellcheckOptions>({
  name: 'customSpellcheck',

  addOptions() {
    return {
      spellchecker: null,
      exceptions: new Set<string>(),
    };
  },

  addProseMirrorPlugins() {
    // 🌟 Сохраняем ссылку на контекст расширения TipTap, 
    // чтобы плагин ProseMirror мог читать options в рантайме
    const extensionContext = this;
    
    return [
      new Plugin({
        key: new PluginKey('customSpellcheck'),
        state: {
          init() {
            return DecorationSet.empty;
          },
          // 🌟 Переводим apply в стрелочную функцию для сохранения связи с extensionContext
          apply: (tr, oldState, oldEditorState) => {
            // Пересчитываем ошибки только при изменении текста или если документ открылся
            if (!tr.docChanged && oldEditorState.doc.eq(tr.doc)) {
              return oldState.map(tr.mapping, tr.doc);
            }

            // 🌟 Достаем АКТУАЛЬНЫЕ данные словаря прямо из контекста TipTap в момент транзакции!
            const { spellchecker, exceptions } = extensionContext.options;

            // Если словари еще не долетели от Photino, очищаем подсветку и выходим
            if (!spellchecker) return DecorationSet.empty;

            const decorations: Decoration[] = [];
            const wordRegex = /\p{L}+/gu;

            tr.doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                let match;
                // Сбрасываем индекс регулярного выражения для каждого нового текстового узла
                wordRegex.lastIndex = 0;

                while ((match = wordRegex.exec(node.text)) !== null) {
                  const word = match[0];
                  const start = pos + match.index;
                  const end = start + word.length;

                  // Если слова нет в Hunspell И его нет в списке исключений
                  if (!exceptions.has(word) && !spellchecker.correct(word)) {
                    decorations.push(
                      Decoration.inline(start, end, {
                        class: 'spellcheck-error',
                        'data-word': word,
                      })
                    );
                  }
                }
              }
            });

            return DecorationSet.create(tr.doc, decorations);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
