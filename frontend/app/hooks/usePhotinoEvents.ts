import { useEffect } from "react";
import { photino } from "@/api/photino";

/**
 * Тип для хранения обработчиков событий, где ключ — имя события, значение — функция обратного вызова.
 */
type Handlers = Record<string, (payload: object|string| null) => void>;

/**
 * Хук для подписки на нативные события из приложения Photino (C#).
 * Позволяет декларативно регистрировать и отписываться от событий в функциональных компонентах React.
 *
 * @param handlers - Объект, где ключи — имена событий, значения — функции-обработчики.
 *                   Каждый обработчик получает полезную нагрузку (`payload`) от нативного кода.
 *
 * @example
 * usePhotinoEvents({
 *   'file-opened': (filePath) => {
 *     console.log('Открыт файл:', filePath);
 *   },
 *   'save-requested': () => {
 *     handleSave();
 *   }
 * });
 *
 * @remarks
 * - Подписка происходит при монтировании компонента.
 * - Автоматическая отписка — при размонтировании.
 * - Для предотвращения лишних переподписок рекомендуется оборачивать `handlers` в `useMemo`.
 */
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
  }, [handlers]); // Важно: handlers должен быть стабильным (например, через useMemo)
}
