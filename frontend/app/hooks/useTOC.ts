import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Editor } from '@tiptap/react';
import { FlatNode, TocItem } from '../types/types';
import { buildTree, debounce } from '../utils/utils';

// useTOC.ts
export const useTOC = () => {
  const [tocTree, setTocTree] = useState<TocItem[]>([]);
  const [activeHeadingPos, setActiveHeadingPos] = useState<number | null>(null);
  
  const flatNodesRef = useRef<FlatNode[]>([]);
  const lastActivePos = useRef<number | null>(null);
  const lastFlatNodes = useRef<string>('');

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

  const debouncedSetToc = useMemo(() => debounce((nodes: FlatNode[]) => {
    const currentCheck = nodes.map(n => n.text).join('|');
    if (currentCheck !== lastFlatNodes.current) {
      lastFlatNodes.current = currentCheck;
      setTocTree(buildTree(nodes));
    }
  }, 500), []);

  return { 
    tocTree, 
    setTocTree,
    activeHeadingPos, 
    setActiveHeadingPos, 
    flatNodesRef, 
    updateActiveHeading, 
    debouncedSetToc 
  };
};
