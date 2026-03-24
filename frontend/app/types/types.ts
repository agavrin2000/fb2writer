// Основной интерфейс для персон (авторы, переводчики)

export interface Fb2Person {
    FirstName?: string;
    MiddleName?: string;
    LastName?: string;
    Nickname?: string;
    Emails?: string[];
}

// Интерфейс для серий
export interface Fb2Sequence {
    name: string;
    number: number;
}

// Общие поля для TitleInfo и SrcTitleInfo
export interface Fb2TitleInfo {
    Genres: string[];
    Authors: Fb2Person[];
    Title: string;
    Annotation: any; // TipTap JSON
    Keywords: string;
    Date: string;
    DateValue: string;
    CoverPage?: string;
    SourcePage?: string;
    Lang: string;
    SrcLang: string;
    Translators: Fb2Person[];
    Sequence: Fb2Sequence[];
}

// Данные о документе
export interface Fb2DocumentInfo {
    Authors: Fb2Person[];
    Program: string;
    Date: string;
    DateValue: string;
    Id: string;
    SrcUrl: string;
    SrcOcr: string;
    Version: string;
    History: any;
}

// Издательские данные
export interface Fb2PublishInfo {
    BookName: string;
    Publisher: string;
    City: string;
    Year: string;
    ISBN: string;
    Sequence: Fb2Sequence[];
}

// Кастомные поля
export interface Fb2CustomInfo {
    customItems: {
        infoType: string;
        value: string;
    }[];
}

// ГЛАВНЫЙ ИНТЕРФЕЙС МЕТАДАННЫХ
export interface Fb2Metadata {
    TitleInfo: Fb2TitleInfo;
    SrcTitleInfo: Fb2TitleInfo;
    DocumentInfo: Fb2DocumentInfo;
    PublishInfo: Fb2PublishInfo;
    CustomInfo: Fb2CustomInfo;
}

// Корневой объект, который приходит с бэкенда
export interface Fb2Data {
    Meta: Fb2Metadata;
    EditorContent: any;
    Footnotes: Record<string, any>;
    FilePath: string;
}

// Элемент оглавления
export interface TocItem {
    pos: number;
    text: string;
    level: number;
    id: string;
    children: TocItem[];
}

export interface FlatNode {
    pos: number;
    text: string;
    level: number;
    id: string;
}

// Активная сноска
export interface ActiveNote {
  id: string;
  x: number;
  y: number;
  isNew?: boolean;
  pos?: number;
}

// Структура контента Tiptap
export interface TiptapContent {
  type: string;
  content?: TiptapContent[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
  attrs?: Record<string, any>;
}

// Ссловарь сносок
export type FootnotesMap = Record<string, TiptapContent[]>;