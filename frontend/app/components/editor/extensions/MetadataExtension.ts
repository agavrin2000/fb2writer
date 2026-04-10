import { Extension, RawCommands } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Fb2Metadata } from "@/types/types";
import { Transaction } from "@tiptap/pm/state"; // Импортируем тип транзакции

const metadataKey = new PluginKey("metadata");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    metadata: {
      /** Обновить метаданные книги и добавить шаг в историю Undo/Redo */
      updateMetadata: (nextMeta: Fb2Metadata) => ReturnType;
    };
  }
  interface Storage {
    metadata: {
      /** Текущие метаданные для отображения в React */
      meta: Fb2Metadata | null;
    };
  }
}

export const MetadataExtension = Extension.create({
  name: "metadata",

  addStorage() {
    return {
      meta: this.options.initialMeta,
    };
  },

addCommands() {
  return {
    updateMetadata: (nextMeta: Fb2Metadata) => ({ tr, dispatch }: { tr: any, dispatch: any }) => {
      if (dispatch) {
        tr.setMeta('metadataUpdate', nextMeta);
        tr.setMeta('addToHistory', true);
        
        // ВАЖНО: Без этого шага Undo не будет работать для метаданных.
        // Мы меняем время последнего обновления в мета-поле самого документа.
        // Даже если у вас нет этого атрибута в схеме, tr.setMeta('dirty', true) 
        // или вставка текста помогут.
        tr.insertText('', 1); // Вставка пустой строки в начало — это "изменение"
      }
      return true;
    },
  } as unknown as RawCommands;
},

  addProseMirrorPlugins() {
    const extension = this;
    return [
      new Plugin({
        key: metadataKey,
        state: {
          init: () => this.options.initialMeta,
          apply: (tr, value) => {
            // Читаем новые метаданные из транзакции
            const nextMeta = tr.getMeta(metadataKey);

            if (nextMeta) {
              extension.storage.meta = nextMeta;
              return nextMeta;
            }

            // ПРОВЕРКА UNDO/REDO:
            // Если транзакция пришла от плагина истории (отмена или возврат)
            // и у нас в транзакции НЕТ наших метаданных (nextMeta === undefined)
            // значит, нам нужно вернуть СТАРОЕ состояние плагина в storage
            if (tr.getMeta("history$")) {
              // Дожидаемся завершения транзакции и синхронизируем storage
              setTimeout(() => {
                extension.storage.meta = value;
              }, 0);
            }

            return value;
          },
        },
      }),
    ];
  },
});
