"use client";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button 
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="toolbar-btn toolbar-btn-default"
    >
      {theme === "dark" ? "🌙 Ночь" : "☀️ День"}
    </button>
  );
}