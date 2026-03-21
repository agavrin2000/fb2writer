import type { Metadata } from "next";
import "./globals.css";


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
      <body>
        {children}
      </body>
    </html>
  );
}
