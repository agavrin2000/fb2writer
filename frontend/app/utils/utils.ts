import { FlatNode, TocItem } from "@/types/types";
import { Node as PMNode } from "@tiptap/pm/model";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { Selection } from "@tiptap/pm/state";

export const buildTree = (
  nodes: { pos: number; text: string; level: number; id: string }[],
) => {
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

export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const debounced = function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = undefined;
    }, ms);
  };

  // Добавляем метод отмены
  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  return debounced;
}

export const collectNodes = (doc: any) => {
  const nodes: FlatNode[] = [];

  // Используем descendants, но жестко ограничиваем глубину поиска
  doc.descendants((node: any, pos: number) => {
    const isSection =
      node.type.name === "fb2Section" || node.type.name === "fb2BodySection";

    if (isSection) {
      let title = "Без названия";
      const isBody = node.type.name === "fb2BodySection";

      // Логика поиска titleNode (ваша сохранена)
      const titleNode = isBody
        ? node.childCount > 1
          ? node.child(1)
          : null
        : node.firstChild;

      if (titleNode && titleNode.type.name === "fb2Title") {
        const parts: string[] = [];
        titleNode.forEach((child: any) => {
          const text = child.textContent.trim();
          if (text) parts.push(text);
        });
        if (parts.length > 0) title = parts.join(" ");
      }

      nodes.push({
        pos: pos + 1,
        text: title,
        level: node.attrs.level || 1,
        id: node.attrs.sectionId,
      });

      // ВАЖНО: возвращаем true, чтобы искать ВЛОЖЕННЫЕ секции внутри текущей,
      // но внутри заголовков (fb2Title) мы уже не ищем.
      return true;
    }

    // Если это не секция (например, параграф или картинка),
    // возвращаем false, чтобы не тратить время на обход его детей.
    return false;
  });

  return nodes;
};

// Хелпер для получения только имени файла из пути (Windows/Linux/macOS)
export const getFileName = (path: string) => {
  return path.split(/[\\/]/).pop() || "";
};

// Хелпер для поиска родительского узла заданного типа
export const findParentNodeByType = (
  selection: Selection,
  targetTypes: string[],
) => {
  // Проверяем, есть ли у выделения свойство $from (оно есть у TextSelection и NodeSelection)
  const $from = (selection as any).$from;

  if (!$from) {
    return { node: null, pos: -1, depth: null, nodeSize: 0 };
  }

  for (let d = $from.depth; d >= 0; d--) {
    const node = $from.node(d);

    if (targetTypes.includes(node.type.name)) {
      return {
        node,
        pos: $from.before(d),
        depth: d,
        nodeSize: node.nodeSize,
      };
    }
  }
  return { node: null, pos: -1, depth: null, nodeSize: 0 };
};
