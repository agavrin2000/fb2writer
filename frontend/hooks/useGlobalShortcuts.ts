import { useEffect } from "react";

export function useGlobalShortcuts(actions: {
  undo: () => void;
  redo: () => void;
  save: () => void;
  open: () => void;
  newFile: () => void;
  toggleContentsSidebar: () => void;
  toggleMetadataSidebar: () => void;
  [key: string]: ((...args: never[]) => unknown) | undefined;  // Это позволит передавать доп. поля без ошибок
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrl = event.ctrlKey || event.metaKey;
      const isAlt = event.altKey;

      if (isCtrl && event.code === "KeyN") {
        event.preventDefault();
        event.stopImmediatePropagation(); // Предотвращаем всплытие к браузеру
        actions.newFile();
        return;
      }

      if (isCtrl && event.code === "KeyO") {
        event.preventDefault();
        event.stopImmediatePropagation(); // Предотвращаем всплытие к браузеру
        actions.open();
        return;
      }

      if (isCtrl && event.code === "KeyS") {
        event.preventDefault();
        event.stopImmediatePropagation(); // Предотвращаем всплытие к браузеру
        actions.open();
        return;
      }

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

      if (isAlt && event.code === "KeyB") {
        event.preventDefault();
        actions.toggleContentsSidebar();
      }
      if (isAlt && event.code === "KeyI") {
        event.preventDefault();
        actions.toggleMetadataSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actions]);
}
