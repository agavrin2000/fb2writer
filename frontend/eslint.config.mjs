import js from "@eslint/js";
import tseslint from "typescript-eslint"; // Добавьте этот импорт
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  js.configs.recommended,
  // 1. Подключаем базовые рекомендации TypeScript
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
      react: reactPlugin,
      "react-hooks": hooksPlugin,
      "@typescript-eslint": tseslint.plugin, // 2. Регистрируем плагин
    },
    languageOptions: {
      parser: tseslint.parser, // 3. Используем TS парсер
      globals: {
        ...globals.browser,
        ...globals.node,
        React: "writable",
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...hooksPlugin.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,

      "react/react-in-jsx-scope": "off",

      // 4. Правильно настраиваем неиспользуемые переменные
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    ignores: [".next/*", "node_modules/*", "out/*"],
  },
];
