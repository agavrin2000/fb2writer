export {};

declare module "*.css";

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
