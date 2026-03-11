import EventEmitter from 'eventemitter3';

export type PhotinoEvent = 

  | { type: 'open-file'; payload: any }
  | { type: 'start-loading'; payload: string }
  | { type: 'error'; payload: string }
  | { type: 'fb2-content'; payload: string } 
  | { type: 'save-success'; payload: string };


class PhotinoBridge extends EventEmitter {
  private bridge: any = null;

  constructor() {
    super();
    if (typeof window !== 'undefined') {
      // 1. Ищем объект для отправки (C# -> JS)
      this.bridge = (window as any).external?.sendMessage 
        ? (window as any).external 
        : (window.parent as any).external;

      // 2. ИСПОЛЬЗУЕМ НАДЕЖНЫЙ МЕТОД ПОДПИСКИ
      // Вместо this.bridge.receiveMessage(...) используем стандартный ивент WebView2
      const webview = (window as any).chrome?.webview;
      
      if (webview) {
        webview.addEventListener('message', (event: any) => {
          this.handleMessage(event.data);
        });
      } else if (this.bridge?.receiveMessage) {
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
    try {
      // Photino/WebView2 может прислать как строку, так и готовый объект
      const message: PhotinoEvent = typeof data === 'string' ? JSON.parse(data) : data;
      console.log("📩 Из .NET:", message);
      this.emit(message.type, message.payload);
    } catch (e) {
      console.warn("Не удалось распарсить сообщение:", data);
    }
  }

  // Метод для отправки команд в C#
  send(type: string, payload: any = null) {
    if (!this.bridge) return;
    
    // Отправляем как простую строку
    const message = payload ? `${type}:${JSON.stringify(payload)}` : type;
    
    this.bridge.sendMessage(message);
    console.log("👉 Отправка в C#:", message);
  }
}

export const photino = new PhotinoBridge();
