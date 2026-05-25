import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Fb2Metadata } from "../../../types/types";

const metadataKey = new PluginKey("metadata");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    metadata: {
      /** Обновить метаданные книги и добавить шаг в историю Undo/Redo */
      updateMetadata: (_nextMeta: Fb2Metadata) => ReturnType;
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
  addGlobalAttributes() {
    return [
      {
        types: ["fb2BodySection"],
        attributes: {
          // Храним ВСЕ метаданные прямо здесь
          meta: {
            default: this.options.initialMeta,
            // Обязательно для глубокого сравнения и сохранения в истории
            keepOnSplit: false,
            renderHTML: () => {
              return {}; // Не добавляет атрибут в итоговый HTML-тег
            },
          },
        },
      },
    ];
  },

  addStorage() {
    return { meta: this.options.initialMeta };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: metadataKey,
        appendTransaction: (transactions, oldState, newState) => {
          // Слушаем ЛЮБЫЕ изменения документа (включая Undo)
          const docChanged = transactions.some((tr) => tr.docChanged);
          if (!docChanged) return null;

          // Ищем метаданные в новом состоянии документа
          let currentMeta: Fb2Metadata | null = null;
          newState.doc.descendants((node) => {
            if (node.type.name === "fb2BodySection" && node.attrs.meta) {
              currentMeta = node.attrs.meta;
              return false;
            }
          });

          // Синхронизируем со Storage для React
          if (
            currentMeta &&
            JSON.stringify(currentMeta) !== JSON.stringify(this.storage.meta)
          ) {
            // Синхронизируем storage в конце очереди задач (не блокируя транзакцию)
              console.log("📦 Metadata Update:", {
                before: this.storage.meta,
                after: currentMeta,
              });
              this.storage.meta = currentMeta;
          }
          return null;
        },
      }),
    ];
  },
  addCommands() {
    return {
      updateMetadata:
        (nextMeta: Fb2Metadata) =>
        ({ tr, dispatch, state }) => {
          // 1. Находим узел
          let pos = -1;
          state.doc.descendants((node, p) => {
            if (node.type.name === "fb2BodySection" && pos === -1) {
              pos = p;
              return false;
            }
          });

          if (pos === -1) return false;

          const node = state.doc.nodeAt(pos);
          const currentMeta = node?.attrs.meta;

          // 2. ПРОВЕРКА: Если данные в документе уже такие же, отменяем транзакцию.
          // Это КРИТИЧЕСКИ важно, чтобы инпуты не теряли фокус при печати.
          if (JSON.stringify(currentMeta) === JSON.stringify(nextMeta))
            return true;

          if (dispatch) {
            tr.setNodeAttribute(pos, 'meta', JSON.parse(JSON.stringify(nextMeta)));
            /*const snapshot = JSON.parse(JSON.stringify(nextMeta));
            tr.setNodeMarkup(pos, undefined, {
              ...node?.attrs,
              meta: snapshot,
            });
            // Разрешаем истории объединять эти шаги
            tr.setMeta("addToHistory", true);*/
          }
          return true;
        },
    };
  },
});
