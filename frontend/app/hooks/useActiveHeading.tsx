import { TocItem } from "@/types/types";
import { Editor } from "@tiptap/react";
import React, { memo, useEffect, useState } from "react";

const flattenTree = (items: TocItem[]): TocItem[] => {
  return items.reduce((acc, item) => {
    // Добавляем сам элемент и рекурсивно всех его детей
    return acc.concat(item, item.children ? flattenTree(item.children) : []);
  }, [] as TocItem[]);
};

export const useActiveHeading = (editor: Editor | null, tree: TocItem[] = []) => {
  const [activePos, setActivePos] = useState<number | null>(null);

  useEffect(() => {
    // Защита: если нет редактора или дерево пустое
    if (!editor || !tree?.length) return;

    const updateActive = () => {
      const { selection } = editor.state;
      const currentPos = selection.$from.pos;

      // 1. Делаем дерево плоским для поиска
      const flatList = flattenTree(tree);

      // 2. Ищем последний заголовок, который "выше" курсора
      // Сначала сортируем по позиции (на всякий случай), потом ищем с конца
      const active = flatList
        .sort((a, b) => a.pos - b.pos)
        .reverse()
        .find((item) => item.pos <= currentPos);

      if (active && active.pos !== activePos) {
        setActivePos(active.pos);
      }
    };

    editor.on('selectionUpdate', updateActive);
    updateActive();

    return () => {
      editor.off('selectionUpdate', updateActive);
    };
  }, [editor, tree, activePos]); // Перезапускаем при смене структуры дерева

  return activePos;
};

