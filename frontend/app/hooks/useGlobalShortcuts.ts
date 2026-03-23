import { useEffect } from "react";

export function useGlobalShortcuts(actions: {
  save: () => void;
  open: () => void;
  toggleContentsSidebar: () => void;
  toggleMetadataSidebar: () => void;
  [key: string]: any; // Это позволит передавать доп. поля без ошибок
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrl = event.ctrlKey || event.metaKey;
      const isAlt = event.altKey;
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

      if (isAlt && event.code === "KeyB") {
        event.preventDefault();
        actions.toggleSidebar();
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
