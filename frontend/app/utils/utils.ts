import { TocItem } from "../types/types";

export const buildTree = (nodes: { pos: number; text: string; level: number; id: string }[]) => {
  const root: TocItem[] = [];
  const stack: TocItem[] = [];
  nodes.forEach((node) => {
    const currentLevel = node.level > 0 ? node.level : 1;
    const item: TocItem = { ...node, level: currentLevel, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].level >= currentLevel)
      stack.pop();
    if (stack.length === 0) root.push(item);
    else stack[stack.length - 1].children.push(item);
    stack.push(item);
  });
  return root;
};