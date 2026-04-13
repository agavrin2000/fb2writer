import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Editor } from "@tiptap/react";
import { FlatNode, TocItem } from "@/types/types";
import { buildTree, debounce } from "@/utils/utils";

/**
 * Хук для управления оглавлением (Table of Contents) на основе структуры документа в редакторе TipTap.
 * Автоматически строит древовидное оглавление из заголовков и отслеживает активный элемент при прокрутке.
 *
 * @returns Объект с состоянием оглавления, ссылками на данные и функциями обновления.
 *
 * @example
 * const { tocTree, activeHeadingPos, updateActiveHeading } = useTOC();
 *
 * // В эффекте редактора:
 * editor.on('update', () => {
 *   const nodes = extractHeadings(editor); // Ваша логика извлечения
 *   flatNodesRef.current = nodes;
 *   debouncedSetToc(nodes);
 * });
 */
export const useTOC = () => {
  /**
   * Древовидная структура оглавления, готовая к отрисовке в компоненте.
   */
  const [tocTree, setTocTree] = useState<TocItem[]>([]);

  /**
   * Позиция начала активного заголовка в документе (используется для подсветки в TOC).
   */
  const [activeHeadingPos, setActiveHeadingPos] = useState<number | null>(null);

  /**
   * Ссылка на плоский массив узлов заголовков — хранится для быстрого доступа без пересчёта.
   */
  const flatNodesRef = useRef<FlatNode[]>([]);

  /**
   * Ссылка на последнюю активную позицию — используется для оптимизации, чтобы не обновлять состояние без необходимости.
   */
  const lastActivePos = useRef<number | null>(null);

  /**
   * Ссылка на строковое представление последнего набора узлов — помогает избежать лишних вычислений при неизменных данных.
   */
  const lastFlatNodes = useRef<string>("");

  /**
   * Функция для определения активного заголовка на основе текущей позиции курсора или прокрутки.
   * Обновляет `activeHeadingPos`, только если позиция реально изменилась.
   *
   * @param editor - Экземпляр редактора TipTap.
   */
  const updateActiveHeading = useCallback((editor: Editor) => {
    const { from } = editor.state.selection;
    const nodes = flatNodesRef.current;

    if (!nodes.length) return;

    let active = null;
    for (const node of nodes) {
      if (node.pos <= from) {
        active = node.pos;
      } else {
        break;
      }
    }

    if (active !== lastActivePos.current) {
      lastActivePos.current = active;
      setActiveHeadingPos(active);
    }
  }, []);

  /**
   * Дебоунс-версия функции установки оглавления, предотвращающая частые перерисовки.
   * Выполняется не чаще чем раз в 500 мс после последнего вызова.
   */
const debouncedSetToc = useMemo(
  () =>
    debounce((nodes: FlatNode[]) => {
      const tree = buildTree(nodes);
      setTocTree(tree);
    }, 500),
  [],
);

  // Очистка дебаунса при размонтировании хука (если используется отменяемый debounce)
  useEffect(() => {
    return () => {
      debouncedSetToc.cancel();
    };
  }, [debouncedSetToc]);

  return {
    tocTree,
    setTocTree,
    lastFlatNodes,
    activeHeadingPos,
    setActiveHeadingPos,
    flatNodesRef,
    updateActiveHeading,
    debouncedSetToc,
  };
};
