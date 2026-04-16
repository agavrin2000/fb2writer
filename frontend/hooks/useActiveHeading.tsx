import { useMemo, useEffect, useState } from "react";
import { Editor } from "@tiptap/react";
import { TocItem } from "../types/types";

// Выносим утилиту и мемоизируем её (или используем внутри useMemo)
const getFlatItems = (items: TocItem[]): TocItem[] => {
  const result: TocItem[] = [];
  const flatten = (list: TocItem[]) => {
    list.forEach(item => {
      result.push(item);
      if (item.children) flatten(item.children);
    });
  };
  flatten(items);
  // Сортируем один раз при изменении дерева, а не при движении курсора
  return result.sort((a, b) => a.pos - b.pos);
};

export const useActiveHeading = (editor: Editor | null, tree: TocItem[] = []) => {
  const [activePos, setActivePos] = useState<number | null>(null);

  // Плоский список пересчитывается ТОЛЬКО когда меняется дерево
  const flatList = useMemo(() => getFlatItems(tree), [tree]);

  useEffect(() => {
    if (!editor || !flatList.length) return;

    const updateActive = () => {
      const { from } = editor.state.selection;
      
      // Ищем последний заголовок, позиция которого меньше или равна текущей
      let currentActive: TocItem | null = null;
      
      for (let i = flatList.length - 1; i >= 0; i--) {
        if (flatList[i].pos <= from) {
          currentActive = flatList[i];
          break;
        }
      }

      const newPos = currentActive?.pos ?? null;
      // React сам сделает проверку на идентичность (newPos !== activePos)
      setActivePos(newPos);
    };

    // 'transaction' лучше, чем 'selectionUpdate', так как ловит и ввод текста
    editor.on("transaction", updateActive);
    updateActive();

    return () => {
      editor.off("transaction", updateActive);
    };
  }, [editor, flatList]); // Убрали activePos, добавили flatList

  return activePos;
};
