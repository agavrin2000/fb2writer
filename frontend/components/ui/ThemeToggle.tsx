"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-md hover:bg-[var(--color-ui-bg-hover)] text-[var(--color-ui-text)] transition-colors flex items-center justify-center"
    >
      {/* Иконка солнца видна только если на html НЕТ класса .dark */}
      <Sun size={18} className="block dark:hidden" />
      {/* Иконка луны видна только если на html ЕСТЬ класс .dark */}
      <Moon size={18} className="hidden dark:block" />
    </button>
  );
}
