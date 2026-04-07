import type { Metadata } from "next";
import "./globals.css";
import { ConfirmProvider } from "@/hooks/ConfirmContext";
import { ToastProvider } from "@/hooks/ToastContext";
import PhotinoInitializer from "@/components/PhotinoInitializer";

export const metadata: Metadata = {
  title: "FB2 Editor",
  description: "Photino React FB2 Editor",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="antialiased">
        <ToastProvider>
          <PhotinoInitializer />
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
