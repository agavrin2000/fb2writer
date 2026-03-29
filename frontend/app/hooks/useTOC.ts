import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { FlatNode, TocItem } from "../types/types";
import { buildTree, debounce } from "../utils/utils";

// useTOC.ts
export const useTOC = () => {
  const [tocTree, setTocTree] = useState<TocItem[]>([]);
  const [activeHeadingPos, setActiveHeadingPos] = useState<number | null>(null);

  const flatNodesRef = useRef<FlatNode[]>([]);
  const lastActivePos = useRef<number | null>(null);
  const lastFlatNodes = useRef<string>("");

  const updateActiveHeading = useCallback((editor: any) => {
    const { from } = editor.state.selection;
    let active = null;

    for (const node of flatNodesRef.current) {
      if (node.pos <= from) active = node.pos;
      else break;
    }

    if (active !== lastActivePos.current) {
      lastActivePos.current = active;
      setActiveHeadingPos(active);
    }
  }, []);

  const debouncedSetToc = useMemo(
    () =>
      debounce((nodes: FlatNode[]) => {
        // Добавляем n.pos, чтобы ловить перемещение заголовков без изменения текста
        const currentCheck = nodes.map((n) => `${n.pos}:${n.text}`).join("|");

        if (currentCheck !== lastFlatNodes.current) {
          lastFlatNodes.current = currentCheck;
          setTocTree(buildTree(nodes));
        }
      }, 500),
    [],
  );

  // Добавьте это, чтобы избежать утечек памяти (если ваш debounce поддерживает cancel)
  useEffect(() => {
    return () => {
      if ((debouncedSetToc as any).cancel) (debouncedSetToc as any).cancel();
    };
  }, [debouncedSetToc]);

  return {
    tocTree,
    setTocTree,
    activeHeadingPos,
    setActiveHeadingPos,
    flatNodesRef,
    updateActiveHeading,
    debouncedSetToc,
  };
};
