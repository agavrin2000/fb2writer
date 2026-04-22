import EventEmitter from "eventemitter3";

export type PhotinoEvent =
  | { type: "open-file"; payload?: string | object }
  | { type: "set-file-name"; payload: string | object }
  | { type: "start-loading"; payload: string | object }
  | { type: "start-saving"; payload: string | object }
  | { type: "image-selected"; payload: string | object }
  | { type: "cancel-loading"; payload: string | object }
  | { type: "save-file"; payload: string | object }
  | { type: "export-epub"; payload: string | object }
  | { type: "error"; payload: string | object }
  | { type: "fb2-content"; payload: string | object }
  | { type: "save-success"; payload: string | object }
  | { type: "show-exit-confirmation"; payload: string | object };

// Вспомогательный тип для извлечения только имен событий
export type PhotinoEventType = PhotinoEvent["type"];

interface IPhotinoBridge {
  // Отправка строки в C#
  sendMessage(message: string): void;
  // Подписка на сообщения из C# (для Linux/macOS)
  receiveMessage(callback: (data: PhotinoEvent | string) => void): void;
}

class PhotinoBridge extends EventEmitter {
  private bridge: IPhotinoBridge | null = null;

  constructor() {
    super();
    if (typeof window === "undefined") return;

    // 1. Инициализируем мост для отправки (JS -> C#)
    // В Photino объект external доступен напрямую в window
    this.bridge = window.external as unknown as IPhotinoBridge;
    // 2. Настраиваем получение сообщений (C# -> JS)
    this.setupReceiver();
  }

  private setupReceiver() {
    const chromeWebview = window.chrome?.webview;

    // 1. Проверяем WebView2 (Windows)
    if (chromeWebview) {
      chromeWebview.addEventListener("message", (event: { data: unknown }) => {
        this.handleMessage(event.data as string | PhotinoEvent);
      });
      console.log("✅ Подключен через WebView2");
      return; // Выходим, чтобы не вешать вторую подписку
    }

    // 2. Фоллбек для Linux/macOS
    if (this.bridge && typeof this.bridge.receiveMessage === "function") {
      try {
        this.bridge.receiveMessage((data: PhotinoEvent | string) =>
          this.handleMessage(data),
        );
        console.log("✅ Подключен через Photino receiveMessage");
      } catch (e) {
        console.error("🚨 Ошибка подписки receiveMessage:", e);
      }
    }
  }

  private handleMessage(data: PhotinoEvent | string): void {
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
  send(type: string, payload: string | object = "") {
    if (!this.bridge?.sendMessage) {
      console.warn("⚠️ Мост Photino не готов к отправке.");
      return;
    }
    const messageObject = { type, payload };

    const jsonMessage = JSON.stringify(messageObject, (key, value) => {
      // 1. Убираем null (заменяем на undefined, чтобы ключ исчез из JSON)
      if (value === null) {
        return undefined;
      }

      // 2. Превращаем числа в строки
      if (typeof value === "number") {
        return value.toString();
      }

      return value;
    });

    this.bridge.sendMessage(jsonMessage);
    console.log("👉 Отправка JSON в C#:", messageObject);
  }
}

export const photino = new PhotinoBridge();
