import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Fb2Metadata } from "../../types/types";

export const metadataKey = new PluginKey('bookMetadata');

export const MetadataPlugin = (initialData: Fb2Metadata |null) => {
  return new Plugin({
    key: metadataKey,
    state: {
      init: () => initialData,
      apply(tr, value) {
        // Проверяем, есть ли в транзакции обновление метаданных
        const meta = tr.getMeta(metadataKey);
        if (meta) {
          return { ...value, ...meta };
        }
        return value;
      },
    },
  });
};