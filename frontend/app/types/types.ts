export interface Fb2Metadata {
    Title: string;
    Author: string;
}

export interface Fb2Data {
    Meta: Fb2Metadata;
    EditorContent: any; 
}

// Описываем интерфейс Photino, но НЕ вкладываем его в window
export interface IPhotinoBridge {
    sendMessage: (message: string) => void;
    receiveMessage: (callback: (message: string) => void) => void;
}

export interface Fb2Data {
    Meta: Fb2Metadata;
    EditorContent: any;
    Footnotes: Record<string, string>; // ID -> Текст примечания
}

export interface TocItem {
    pos: number;
    text: string;
    level: number;
    children: TocItem[];
}
