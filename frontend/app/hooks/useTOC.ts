import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { FlatNode, TocItem } from "../types/types";
import { buildTree, debounce } from "../utils/utils";
import { Editor } from "@tiptap/react";

// useTOC.ts
export const useTOC = () => {
  const [tocTree, setTocTree] = useState<TocItem[]>([]);
  const [activeHeadingPos, setActiveHeadingPos] = useState<number | null>(null);

  const flatNodesRef = useRef<FlatNode[]>([]);
  const lastActivePos = useRef<number | null>(null);
  const lastFlatNodes = useRef<string>("");

  const updateActiveHeading = useCallback((editor: Editor) => {
    const { from } = editor.state.selection;

    // Берем данные напрямую из Ref, они обновляются мгновенно в onUpdate/onSelectionUpdate
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

    // Обновляем стейт только если позиция РЕАЛЬНО изменилась
    if (active !== lastActivePos.current) {
      lastActivePos.current = active;
      setActiveHeadingPos(active);
    }
  }, []);

  const debouncedSetToc = useMemo(
    () =>
      debounce((nodes: FlatNode[]) => {
        const tree = buildTree(nodes);
        setTocTree(tree);
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
    lastFlatNodes,
    activeHeadingPos,
    setActiveHeadingPos,
    flatNodesRef,
    updateActiveHeading,
    debouncedSetToc,
  };
};
