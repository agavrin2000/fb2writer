"use client";

import { useEffect } from "react";
import { photino } from "./photino";

/**
 * Компонент-инициализатор для интеграции с нативным приложением Photino.
 * Отправляет сигнал `app-ready` в C#-код после завершения гидратации на стороне клиента.
 *
 * Это позволяет синхронизировать момент, когда React-интерфейс готов к взаимодействию,
 * с логикой десктопного приложения, например, для скрытия сплеш-экрана или активации окна.
 *
 * @component
 * @remarks
 * - Использует небольшую задержкудля надёжной синхронизации с процессом гидратации Next.js.
 * - Работает только на клиенте (`typeof window !== "undefined"`).
 * - Не отрисовывает никаких DOM-элементов — чисто побочный эффект.
 *
 * @example
 * // Добавляется в корневой компонент страницы
 * <PhotinoInitializer />
 */
export default function PhotinoInitializer() {
  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      if (typeof window !== "undefined") {
        photino.send("app-ready");
      }
    });
    // Очистка на случай размонтирования компонента
    return () => cancelAnimationFrame(handle);
  }, []);
  return null; // Компонент ничего не рендерит
}
