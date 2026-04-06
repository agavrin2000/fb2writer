import type { Metadata } from "next";
import "./globals.css";
import { ConfirmProvider } from "@/hooks/ConfirmContext";
import { ToastProvider } from "@/hooks/ToastContext";

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
      <meta
        http-equiv="Cache-Control"
        content="no-cache, no-store, must-revalidate"
      />
      <meta http-equiv="Pragma" content="no-cache" />
      <meta http-equiv="Expires" content="0" />
      <body className="antialiased">
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
