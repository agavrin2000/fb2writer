import EventEmitter from "eventemitter3";

export type PhotinoEvent =
  | { type: "open-file"; payload?: any }
  | { type: "set-file-name"; payload: string }
  | { type: "start-loading"; payload: string }
  | { type: "start-saving"; payload: string }
  | { type: "image-selected"; payload: string }
  | { type: "cancel-loading"; payload: string }
  | { type: "save-file"; payload: string }
  | { type: "error"; payload: string }
  | { type: "fb2-content"; payload: string }
  | { type: "save-success"; payload: string }
  | { type: "show-exit-confirmation"; payload: string };

// Вспомогательный тип для извлечения только имен событий
export type PhotinoEventType = PhotinoEvent["type"];

interface IPhotinoBridge {
  // Отправка строки в C#
  sendMessage(message: string): void;
  // Подписка на сообщения из C# (для Linux/macOS)
  receiveMessage(callback: (data: string | object) => void): void;
}

class PhotinoBridge extends EventEmitter {
  private bridge: IPhotinoBridge | null = null;

  constructor() {
    super();
    if (typeof window === "undefined") return;

    // 1. Инициализируем мост для отправки (JS -> C#)
    // В Photino объект external доступен напрямую в window
    this.bridge = (window as any).external as IPhotinoBridge;

    // 2. Настраиваем получение сообщений (C# -> JS)
    this.setupReceiver();
  }

  private setupReceiver() {
    const chromeWebview = (window as any).chrome?.webview;

    // Вариант А: Современный WebView2 (Windows)
    if (chromeWebview) {
      chromeWebview.addEventListener("message", (event: any) => {
        this.handleMessage(event.data);
      });
    }

    // Вариант Б: Фоллбек для Photino на Linux/macOS или старых версий
    // Важно: проверяем наличие метода, но не используем 'else',
    // так как в некоторых сборках работают оба механизма,
    // а handleMessage внутри сам разберется с дубликатами, если они возникнут.
    if (this.bridge && typeof this.bridge.receiveMessage === "function") {
      try {
        this.bridge.receiveMessage((data: any) => this.handleMessage(data));
      } catch (e) {
        console.error("🚨 Ошибка подписки receiveMessage:", e);
      }
    }
  }

  private handleMessage(data: any): void {
    if (data === null || data === undefined) return;

    try {
      let event: PhotinoEvent | null = null;

      if (typeof data === "object") {
        event = data as PhotinoEvent;
      } else if (typeof data === "string") {
        const trimmed = data.trim();
        if (trimmed.startsWith("{")) {
          event = JSON.parse(trimmed) as PhotinoEvent;
        }
      }

      if (event && event.type) {
        console.log("📩 Из .NET:", event);
        this.emit(event.type, event.payload);
      }
    } catch (e) {
      console.error("🚨 Ошибка обработки сообщения Photino:", e, data);
    }
  }

  // Метод для отправки команд в C#
  send(type: string, payload: any = null) {
    if (!this.bridge?.sendMessage) {
      console.warn("⚠️ Мост Photino не готов к отправке.");
      return;
    }
    const messageObject = { type, payload };

    const jsonMessage = JSON.stringify(messageObject, (key, value) => {
      return value === null ? undefined : value;
    });

    this.bridge.sendMessage(jsonMessage);
    console.log("👉 Отправка JSON в C#:", messageObject);
  }
}

export const photino = new PhotinoBridge();
