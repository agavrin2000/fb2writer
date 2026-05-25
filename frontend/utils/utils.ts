import { Selection } from "@tiptap/pm/state";
import { FlatNode, TocItem } from "../types/types";
import { Node as ProsemirrorNode } from "@tiptap/pm/model";
import { Editor } from "@tiptap/react";
import { JSONContent } from "@tiptap/core";

/**
 * Строит иерархическое дерево из плоского массива узлов на основе их уровня (`level`).
 * Используется для генерации оглавления (TOC) по заголовкам документа.
 *
 * Алгоритм использует стек для отслеживания текущего пути в дереве:
 * - Если уровень текущего узла меньше или равен уровню вершины стека — поднимаемся вверх.
 * - Добавляет узел как дочерний последнему элементу в стеке или в корень.
 *
 * @param nodes - Массив плоских узлов с полями: `pos`, `text`, `level`, `id`.
 * @returns Иерархическая структура типа `TocItem[]`.
 *
 * @example
 * const tree = buildTree([
 *   { pos: 10, text: "Глава 1", level: 1, id: "ch1" },
 *   { pos: 50, text: "Подраздел 1.1", level: 2, id: "ch1-1" }
 * ]);
 */ export const buildTree = (
  nodes: { pos: number; text: string; level: number; id: string }[],
) => {
  const root: TocItem[] = [];
  const stack: TocItem[] = [];
  nodes.forEach((node) => {
    const currentLevel = node.level > 0 ? node.level : 1;
    const item: TocItem = { ...node, level: currentLevel, children: [] };

    // Удаляем из стека все узлы с уровнем >= текущего
    while (stack.length > 0 && stack[stack.length - 1].level >= currentLevel)
      stack.pop();

    // Добавляем в корень или к родителю
    if (stack.length === 0) root.push(item);
    else stack[stack.length - 1].children.push(item);

    // Помещаем текущий узел в стек
    stack.push(item);
  });

  return root;
};

/**
 * Возвращает обёрнутую функцию, вызов которой откладывается на указанное количество миллисекунд.
 * Повторные вызовы до истечения времени сбрасывают таймер.
 * Полезно для оптимизации операций, вызываемых часто (например, обновление при скролле или вводе).
 *
 * Добавляет метод `cancel()` к возвращаемой функции для принудительной отмены отложенного вызова.
 *
 * @param fn - Функция, которую нужно выполнить после задержки.
 * @param ms - Задержка в миллисекундах.
 * @returns Обёрнутая функция с методом `cancel()`.
 *
 * @example
 * const debouncedSave = debounce(saveToServer, 1000);
 * debouncedSave(); // Перезапускает таймер
 * debouncedSave.cancel(); // Отменяет сохранение
 */
export function debounce<A extends unknown[], R>(
  fn: (...args: A) => R,
  ms: number,
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  // 1. Создаем основную функцию
  const debouncedFn = function (this: unknown, ...args: A) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = undefined;
    }, ms);
  };

  // 2. Явно добавляем метод
  const debounced = debouncedFn as typeof debouncedFn & { cancel: () => void };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  return debounced;
}

/**
 * Собирает все узлы секций (`fb2Section`, `fb2BodySection`) из документа ProseMirror.
 * Для каждой секции извлекает заголовок, уровень и ID, создавая плоский список узлов.
 *
 * Используется для построения оглавления. Обходит только нужные типы узлов,
 * пропуская содержимое заголовков, чтобы избежать рекурсивного поиска внутри них.
 *
 * @param doc - Корневой узел документа ProseMirror.
 * @returns Массив плоских узлов типа `FlatNode[]`.
 */
export const collectNodes = (doc: ProsemirrorNode) => {
  const nodes: FlatNode[] = [];

  // Используем descendants, но жестко ограничиваем глубину поиска
  doc.descendants((node: ProsemirrorNode, pos: number) => {
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
        titleNode.forEach((child: ProsemirrorNode) => {
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

/**
 * Извлекает имя файла из полного пути.
 * Поддерживает как Unix-подобные (`/`), так и Windows-пути (`\`).
 *
 * @param path - Полный путь к файлу.
 * @returns Только имя файла без директории.
 *
 * @example
 * getFileName("/home/user/doc.fb2") // → "doc.fb2"
 * getFileName("C:\\Books\\novel.fb2") // → "novel.fb2"
 */
export const getFileName = (path: string) => {
  return path.split(/[\\/]/).pop() || "";
};

/**
 * Находит ближайший родительский узел заданного типа для текущего выделения.
 *
 * Используется для определения контекста редактирования (например, находится ли курсор внутри секции).
 *
 * @param selection - Текущее выделение в редакторе.
 * @param targetTypes - Массив имён типов узлов, которые нужно найти (например, `["fb2Section"]`).
 * @returns Объект с найденным узлом, его позицией, глубиной и размером, или `null`, если не найден.
 */
export const findParentNodeByType = (
  selection: Selection,
  targetTypes: string[],
) => {
  // Проверяем, есть ли у выделения свойство $from (оно есть у TextSelection и NodeSelection)
  if (!("$from" in selection)) {
    return { node: null, pos: -1, depth: null, nodeSize: 0 };
  }
  const { $from } = selection;

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

/**
 * Применяет типографские правила к содержимому документа в редакторе Tiptap.
 *
 * Выполняет автоматическую коррекцию текста по следующим правилам:
 * - Замена множественных пробелов, табуляций и неразрывных пробелов на один обычный пробел.
 * - Замена дефисов и коротких тире на длинное тире (—) при наличии пробелов с обеих сторон.
 * - Автоматическая расстановка «кавычек-ёлочек»: открывающие и закрывающие кавычки.
 *
 * Обработка осуществляется рекурсивно по всем узлам JSON-представления документа,
 * что позволяет корректно работать с текстом внутри таблиц, списков и других структур.
 *
 * @param editor - Экземпляр редактора Tiptap. Если `null` или не передан — возвращается сообщение об ошибке.
 * @example
 * ```ts
 * applyTypographyToBook(editor);
 * ```
 *
 * @remarks
 * Метод изменяет содержимое редактора напрямую через `editor.commands.setContent()`,
 * сохраняя состояние фокуса и истории редактирования (если это поддерживается командой).
 */
export function applyTypographyToBook(editor: Editor) {
  if (!editor) console.error("Ошибка: Редактор не найден");
  // 1. Получаем текущий документ в формате JSON
  const jsonDoc = editor.getJSON();

  // Регулярные выражения (точно такие же, как для FB2)
  const doubleSpacesRegex = /[ \u00A0\t]+/g;
  const dashRegex = /(?<=^|\s)[-—–](?=\s)/g;
  // Ищет кавычку (", ', ”, „), перед которой стоит пробел, начало строки, скобка ИЛИ длинное тире диалога (—)
  // И после которой ОБЯЗАТЕЛЬНО идет буква или цифра (\p{L}\p{N} с флагом /u)
  const openQuoteRegex = /(?<=^|[\s(\[—])["'„“\u201C\u201D](?=\p{L}|\p{N})/gu;

  // 2. Закрывающая кавычка »ёлочка»
  // Ищет кавычку, перед которой стоит буква, цифра или знак препинания (. ! ? , )
  // И после которой идет пробел, конец строки, скобка или знак препинания
  const closeQuoteRegex =
    /(?<=\p{L}|\p{N}|[.!?,”\])])["'„“\u201C\u201D](?=$|[\s)\].,!?—])/gu;

  // 2. Рекурсивная функция обхода дерева TipTap JSON
  function transformNode(node: JSONContent) {
    if (!node) return;

    // Если это текстовый узел — обрабатываем его содержимое
    if (node.type === "text" && node.text) {
      let txt = node.text;

      // Шаг А. Убираем двойные пробелы
      txt = txt.replace(doubleSpacesRegex, " ");
      // Шаг Б. Ставим длинное тире
      txt = txt.replace(dashRegex, "—");
      // Шаг В. Расставляем кавычки-ёлочки
      txt = txt.replace(openQuoteRegex, "«").replace(closeQuoteRegex, "»");

      node.text = txt;
    }

    // Если у узла есть дочерние элементы (абзацы, ячейки таблиц, списки), идем глубже
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(transformNode);
    }
  }

  // Запускаем трансформацию с корня документа
  transformNode(jsonDoc);

  // 3. Возвращаем обновленный JSON обратно в TipTap без потери фокуса и истории
  editor.commands.setContent(jsonDoc);
}
