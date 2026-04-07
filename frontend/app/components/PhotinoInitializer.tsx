"use client";

import { useEffect } from "react";
import { photino } from "@/api/photino";

export default function PhotinoInitializer() {
  useEffect(() => {
    // Ждем небольшую паузу, чтобы Next.js успел полностью гидрировать дерево
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        // Отправляем сигнал готовности в C#
        // Убедитесь, что формат строки совпадает с тем, что ждет C# (с двоеточием)
        photino.send("app-ready:");
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return null; // Компонент ничего не рендерит
}
