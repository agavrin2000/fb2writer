declare module "*.css";

// Расширяем глобальный объект Window
declare global {
  interface Window {
    // Для Photino
    external: {
      /** Отправка сообщения в C# */
      sendMessage: (message: string) => void;
      /** Регистрация колбэка для сообщений из C# */
      receiveMessage: (callback: (message: string) => void) => void;
    };
    // Для WebView2
    chrome?: {
      webview?: {
        addEventListener: (
          type: "message",
          listener: (event: { data: unknown }) => void,
        ) => void;
        postMessage: (message: unknown) => void;
      };
    };
  }
}

// Описываем сторонние библиотеки БЕЗ export {} на верхнем уровне файла
declare module 'nspell' {
  export interface Dictionary {
    aff: string;
    dic: string;
  }

  // Описываем инстанс как обычный интерфейс/класс
  export interface NSpell {
    correct(word: string): boolean;
    suggest(word: string): string[];
    add(word: string): this;
    remove(word: string): this;
  }

  // Описываем саму функцию-конструктор, которая экспортируется по умолчанию
  function nspell(dict: unknown): NSpell;
  function nspell(aff: string, dic: string): NSpell;

  export default nspell;
}