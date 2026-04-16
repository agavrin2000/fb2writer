import React from "react";
import type { Metadata } from "next";
import "@/globals.css";
import { ConfirmProvider } from "@/hooks/ConfirmContext";
import { ToastProvider } from "@/hooks/ToastContext";
import PhotinoInitializer from "@/services/PhotinoInitializer";
import { ThemeProvider } from 'next-themes'
/**
 * Метаданные страницы приложения.
 * Определяют заголовок и описание для корневого макета.
 */
export const metadata: Metadata = {
  title: "FB2 Writer",
  description: "Photino React FB2 Writer",
};

/**
 * Корневой макет приложения.
 * Обеспечивает общую структуру и предоставляет контексты для всего приложения.
 *
 * Оборачивает дочерние компоненты в провайдеры:
 * - {@link ToastProvider} — для отображения всплывающих уведомлений.
 * - {@link ConfirmProvider} — для централизованного управления модальными диалогами подтверждения.
 * - {@link PhotinoInitializer} — для отправки сигнала о готовности интерфейса в нативное приложение Photino.
 *
 * Также устанавливает язык интерфейса (`lang="ru"`) и подключает глобальные стили.
 *
 * @component
 * @param children - Дочерние элементы, из которых состоит текущая страница.
 *
 * @example
 * <RootLayout>
 *   <Page />
 * </RootLayout>
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" 
          enableSystem>
          <ToastProvider>
            <PhotinoInitializer />
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
