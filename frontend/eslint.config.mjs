import { defineConfig } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

//const __filename = fileURLToPath(import.meta.url);
//const __dirname = dirname(__filename);

export default defineConfig(
  {
    ignores: [".next/*", "node_modules/*", "out/*"],
  },
    ...nextVitals,
  ...nextTs,
  //js.configs.recommended,
  //...tseslint.configs.recommended,
  // Подключаем конфиги Next.js через compat
  // Это само подтянет нужные версии react-hooks без конфликтов
  //...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    languageOptions: {
      globals: {
        React: "writable",
      },
    },
    rules: {
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",

      // Настройка неиспользуемых переменных
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },
);
