import EventEmitter from "eventemitter3";

export type PhotinoEvent =
  | { type: "open-file"; payload: any }
  | { type: "start-loading"; payload: string }
  | { type: "start-saving"; payload: string }
  | { type: "image-selected"; payload: string }
  | { type: "cancel-loading"; payload: string }
  | { type: "save-file"; payload: string }
  | { type: "error"; payload: string }
  | { type: "fb2-content"; payload: string }
  | { type: "save-success"; payload: string }
  | { type: "show-exit-confirmation"; payload: string };

class PhotinoBridge extends EventEmitter {
  private bridge: any = null;

  constructor() {
    super();
    if (typeof window !== "undefined") {
      // 1. Ищем объект для отправки (C# -> JS)
      this.bridge = (window as any).external?.sendMessage
        ? (window as any).external
        : (window.parent as any).external;

      // 2. ИСПОЛЬЗУЕМ НАДЕЖНЫЙ МЕТОД ПОДПИСКИ
      // Вместо this.bridge.receiveMessage(...) используем стандартный ивент WebView2
      const webview = (window as any).chrome?.webview;

      if (webview) {
        webview.addEventListener("message", (event: any) => {
          this.handleMessage(event.data);
        });
      } else if (this.bridge && typeof this.bridge.receiveMessage === 'function') {
        // Фоллбек для старых версий или других ОС
        try {
          this.bridge.receiveMessage((data: any) => this.handleMessage(data));
        } catch (e) {
          console.error("Ошибка подписки через receiveMessage:", e);
        }
      }
    }
  }


  private handleMessage(data: any) {
    console.log("RAW DATA:", data)
    try {
      // 1. Если это уже объект (Photino часто делает JSON.parse за тебя), используем его
      // 2. Если это строка, парсим один раз
      let message: PhotinoEvent;

      if (typeof data === "object" && data !== null) {
        message = data as PhotinoEvent;
      } else if (typeof data === "string") {
        // Проверяем, не пустая ли строка, прежде чем парсить
        const trimmed = data.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          message = JSON.parse(trimmed);
        } else {
          // Это просто строка, а не JSON-объект
          console.warn("Получена строка, которая не является JSON:", data);
          return;
        }
      } else {
        return;
      }

      // Эмитим событие, если у нас есть тип
      if (message && message.type) {
        console.log("📩 Из .NET:", message);
        this.emit(message.type, message.payload);
      }
    } catch (e) {
      console.error("Ошибка парсинга Photino:", e, "Данные:", data);
    }
  }

  // Метод для отправки команд в C#
  send(type: string, payload: any = null) {
    if (!this.bridge) return;

    // Отправляем как простую строку
    const message = payload ? `${type}:${JSON.stringify(payload)}` : `${type}:`;

    this.bridge.sendMessage(message);
    console.log("👉 Отправка в C#:", message);
  }
}

export const photino = new PhotinoBridge();
