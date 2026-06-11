import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import nspell from 'nspell';

interface HunspellStorage {
  hunspell: any | null;
  isLoaded: boolean;
}

export const TiptapHunspellWasm = Extension.create<unknown, HunspellStorage>({
  name: 'hunspellWasmSpellcheck',

  addStorage(): HunspellStorage {
    return {
      hunspell: null,
      isLoaded: false,
    };
  },

  async onCreate() {
    try {
      const affText = await fetch('assets/ru_RU.aff').then(res => res.text());
      const dicText = await fetch('assets/ru_RU.dic').then(res => res.text());

      this.storage.hunspell = nspell(affText, dicText);
      this.storage.isLoaded = true;

      this.editor.view.dispatch(this.editor.state.tr);
    } catch (e) {
      console.error('Ошибка инициализации nspell:', e);
    }
  },

  addProseMirrorPlugins() {
    const storage = this.storage;
    const pluginKey = new PluginKey('hunspellWasmSpellcheck');
    const spellCache = new Map<string, string[] | null>();

    const checkWordCached = (word: string): string[] | null => {
      if (spellCache.has(word)) return spellCache.get(word)!;
      const isCorrect = storage.hunspell.correct(word);
      if (isCorrect) {
        spellCache.set(word, null);
        return null;
      } else {
        const suggestions = storage.hunspell.suggest(word);
        spellCache.set(word, suggestions);
        return suggestions;
      }
    };

    return [
      new Plugin({
        key: pluginKey,
        
        state: {
          init() { return DecorationSet.empty; },
          apply(tr, oldPluginState) {
            const meta = tr.getMeta(pluginKey);
            if (meta instanceof DecorationSet) return meta;
            // Мгновенно сдвигаем старые красные линии по индексам при вводе букв
            return oldPluginState.map(tr.mapping, tr.doc);
          }
        },

        props: {
          decorations(state) {
            return pluginKey.getState(state) || DecorationSet.empty;
          },
          handleDOMEvents: {
            contextmenu: (view, event) => {
              const target = event.target as HTMLElement;
              if (target?.classList.contains('hunspell-error')) {
                event.preventDefault();
                const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
                if (pos) {
                  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, pos.pos)));
                }
                return true;
              }
              return false;
            }
          }
        },

        view(editorView) {
          let observer: IntersectionObserver | null = null;
          const visibleElements = new Set<Element>();
          let timeoutId: number | null = null;

          // Тяжелая логика проверки вынесена сюда и больше не зависит от window.scrollY и ресайза
          const checkVisibleNodes = () => {
            if (!storage.isLoaded || !storage.hunspell || visibleElements.size === 0) return;

            const decorations: Decoration[] = [];

            visibleElements.forEach((el) => {
              // Находим числовую позицию начала конкретного видимого DOM-абзаца в ProseMirror
              const pos = editorView.posAtDOM(el, 0);
              if (pos < 0) return;

              const node = editorView.state.doc.nodeAt(pos);
              if (!node || !node.textContent) return;

              // Сканируем только текст этого конкретного абзаца
              const text = node.textContent;
              const wordRegex = /[A-Za-zА-Яа-яЁё]+/g;
              let match: RegExpExecArray | null;

              while ((match = wordRegex.exec(text)) !== null) {
                const word = match[0];
                if (word.length > 30) continue;

                const wordStart = pos + match.index + 1; // +1 сдвиг для инлайн-контента
                const wordEnd = wordStart + word.length;

                const suggestions = checkWordCached(word);
                if (suggestions !== null) {
                  decorations.push(
                    Decoration.inline(wordStart, wordEnd, {
                      class: 'hunspell-error',
                      'data-suggestions': JSON.stringify(suggestions),
                      'data-word': word
                    })
                  );
                }
              }
            });

            // Мягко накатываем декорации на документ
            const currentDecorations = DecorationSet.create(editorView.state.doc, decorations);
            const tr = editorView.state.tr.setMeta(pluginKey, currentDecorations);
            editorView.dispatch(tr);
          };

          const scheduleCheck = () => {
            if (timeoutId !== null) clearTimeout(timeoutId);
            timeoutId = window.setTimeout(checkVisibleNodes, 250);
          };

          // Настраиваем ленивое отслеживание видимости через нативный API
          observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                visibleElements.add(entry.target);
              } else {
                visibleElements.delete(entry.target);
              }
            });
            scheduleCheck();
          }, {
            root: null, // Отслеживаем относительно вьюпорта экрана
            rootMargin: '300px', // Начинаем проверять абзацы за 300px до того, как пользователь доскроллит до них
            threshold: 0.1
          });

          // Подписываемся на все абзацы в редакторе
          const observeNodes = () => {
            if (!observer || !editorView.dom) return;
            editorView.dom.querySelectorAll('p').forEach((p) => {
              observer?.observe(p);
            });
          };

          // Первичный запуск подписки
          observeNodes();

          return {
            update(view, prevState) {
              // Если структура документа изменилась (добавились или удалились абзацы),
              // обновляем список подписок в наблюдателе
              if (!view.state.doc.eq(prevState.doc)) {
                observeNodes();
                scheduleCheck();
              }
            },
            destroy() {
              if (observer) {
                observer.disconnect();
              }
              if (timeoutId !== null) clearTimeout(timeoutId);
            }
          };
        }
      }),
    ];
  },
});
