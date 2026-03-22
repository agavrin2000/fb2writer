import { useEffect } from "react";
import { photino } from "../../api/photino"; // Ваш объект класса PhotinoBridge

// Типизируем так, чтобы ключом могла быть любая строка
type Handlers = Record<string, (payload: any) => void>;

export function usePhotinoEvents(handlers: Handlers) {
  useEffect(() => {
    // Регистрируем все переданные обработчики
    Object.entries(handlers).forEach(([event, callback]) => {
      if (callback) {
        photino.on(event, callback);
      }
    });

    return () => {
      // Автоматически отписываемся при размонтировании
      Object.entries(handlers).forEach(([event, callback]) => {
        if (callback) {
          photino.off(event, callback);
        }
      });
    };
  }, [handlers]); // Важно: handlers должен быть обернут в useMemo в родителе
}