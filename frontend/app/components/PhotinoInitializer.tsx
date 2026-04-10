"use client";

import { useEffect } from "react";
import { photino } from "@/api/photino";

/**
 * Компонент-инициализатор для интеграции с нативным приложением Photino.
 * Отправляет сигнал `app-ready` в C#-код после завершения гидратации на стороне клиента.
 *
 * Это позволяет синхронизировать момент, когда React-интерфейс готов к взаимодействию,
 * с логикой десктопного приложения, например, для скрытия сплеш-экрана или активации окна.
 *
 * @component
 * @remarks
 * - Использует небольшую задержку (100 мс) для надёжной синхронизации с процессом гидратации Next.js.
 * - Работает только на клиенте (`typeof window !== "undefined"`).
 * - Не отрисовывает никаких DOM-элементов — чисто побочный эффект.
 *
 * @example
 * // Добавляется в корневой компонент страницы
 * <PhotinoInitializer />
 */
export default function PhotinoInitializer() {
  useEffect(() => {
    // Ждем небольшую паузу, чтобы Next.js успел полностью гидрировать дерево
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        // Отправляем сигнал готовности в C#
        photino.send("app-ready");
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return null; // Компонент ничего не рендерит
}
