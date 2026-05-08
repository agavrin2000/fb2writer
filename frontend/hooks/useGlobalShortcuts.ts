import { useEffect } from "react";

/**
 * Хук для обработки глобальных сочетаний клавиш в приложении.
 * Регистрирует слушатель события `keydown` на уровне `window` и блокирует стандартные действия браузера
 * для определённых комбинаций, вызывая переданные пользовательские действия.
 *
 * @param actions - Объект с функциями, которые будут вызваны при нажатии соответствующих сочетаний клавиш.
 *                  Допустимы как обязательные, так и дополнительные поля (через индексный сигнатур).
 *
 * @example
 * ```ts
 * useGlobalShortcuts({
 *   undo: () => console.log("Отмена"),
 *   redo: () => console.log("Повтор"),
 *   save: () => console.log("Сохранить"),
 *   open: () => console.log("Открыть"),
 *   newFile: () => console.log("Новый файл"),
 *   toggleContentsSidebar: () => console.log("Переключить боковую панель содержания"),
 *   toggleMetadataSidebar: () => console.log("Переключить боковую панель метаданных")
 * });
 * ```
 *
 * @remarks
 * Слушатель добавляется с параметром `useCapture = true`, что означает:
 * - событие перехватывается на этапе захвата, до всплытия;
 * - позволяет предотвратить выполнение действий браузера раньше, чем они достигнут целевого элемента.
 *
 * Все стандартные действия (`preventDefault`, `stopImmediatePropagation`) используются для:
 * - блокировки перезагрузки страницы;
 * - отключения встроенных горячих клавиш браузера (например, Ctrl+S, Ctrl+O).
 *
 * @listens window#keydown - Основное событие, обрабатываемое хуком.
 */
export function useGlobalShortcuts(actions: {
  /**
   * Отмена последнего действия (Ctrl+Z)
   */
  undo: () => void;
  /**
   * Повтор отменённого действия (Ctrl+Y)
   */
  redo: () => void;
  /**
   * Сохранение текущего документа (Ctrl+S)
   */
  save: () => void;
  /**
   * Открытие документа (Ctrl+O)
   */
  open: () => void;
  /**
   * Создание нового документа (Ctrl+N)
   */
  newFile: () => void;
  /**
   * Переключение видимости боковой панели содержания (Alt+B)
   */
  toggleContentsSidebar: () => void;
  /**
   * Переключение видимости боковой панели метаданных (Alt+I)
   */
  toggleMetadataSidebar: () => void;
  /**
   * Индексная сигнатура, позволяющая передавать дополнительные поля без ошибок TypeScript.
   */
  [key: string]: ((...args: never[]) => unknown) | undefined;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrl = event.ctrlKey || event.metaKey;
      const isAlt = event.altKey;
      const isShift = event.shiftKey;

      // Блокировка всех видов обновления: 
      // F5, Ctrl+R, Ctrl+Shift+R
      //  и альтернативных способов вызова DevTools
      // Ctrl + Shift + I, Ctrl + Shift + J
      // просмотра исходного кода страницы Ctrl + U
      if (
        event.code === "F5" || 
        (isCtrl && event.code === "KeyR") || 
        (isCtrl && event.code === "KeyU") || 
        (isCtrl && isShift && event.code === "KeyR") ||
        (isCtrl && isShift && event.code === "KeyI") ||
        (isCtrl && isShift && event.code === "KeyJ")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      // New file
      if (isCtrl && event.code === "KeyN") {
        event.preventDefault();
        event.stopImmediatePropagation(); // Предотвращаем всплытие к браузеру
        actions.newFile();
        return;
      }

      // Open file
      if (isCtrl && event.code === "KeyO") {
        event.preventDefault();
        event.stopImmediatePropagation(); // Предотвращаем всплытие к браузеру
        actions.open();
        return;
      }

      // Save file
      if (isCtrl && event.code === "KeyS") {
        event.preventDefault();
        event.stopImmediatePropagation(); // Предотвращаем всплытие к браузеру
        actions.open();
        return;
      }

      // Undo/redo
      if (isCtrl && event.code === "KeyZ") {
        event.preventDefault();
        event.stopImmediatePropagation(); // Предотвращаем всплытие к браузеру
        actions.undo();
        return;
      }
      if (isCtrl && event.code === "KeyY") {
        event.preventDefault();
        event.stopImmediatePropagation(); // Предотвращаем всплытие к браузеру
        actions.redo();
        return;
      }

      // Toggle sidebars
      if (isAlt && event.code === "KeyB") {
        event.preventDefault();
        actions.toggleContentsSidebar();
      }
      if (isAlt && event.code === "KeyI") {
        event.preventDefault();
        actions.toggleMetadataSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [actions]);
}
