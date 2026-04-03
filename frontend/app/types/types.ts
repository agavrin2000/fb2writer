// Основной интерфейс для персон (авторы, переводчики)
export interface Fb2Person {
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  Nickname?: string;
  Emails?: string[];
  Id?: string;
}

// Интерфейс для серий
export interface Fb2Sequence {
  Name: string;
  Number: number;
}

// Общие поля для TitleInfo и SrcTitleInfo
export interface Fb2TitleInfo {
  Genres: string[];
  Authors: Fb2Person[];
  Title: string;
  Annotation?: any; // TipTap JSON
  Keywords?: string;
  Date?: string;
  DateValue?: string;
  CoverPage?: string;
  SourcePage?: string;
  Lang: string;
  SrcLang?: string;
  Translators?: Fb2Person[];
  Sequence?: Fb2Sequence[];
}

// Данные о документе
export interface Fb2DocumentInfo {
  Authors: Fb2Person[];
  Program?: string;
  Date: string;
  DateValue: string;
  Id: string;
  SrcUrl?: string;
  SrcOcr?: string;
  Version: string;
  History?: any;
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
  SrcTitleInfo?: Fb2TitleInfo;
  DocumentInfo: Fb2DocumentInfo;
  PublishInfo?: Fb2PublishInfo;
  CustomInfo?: Fb2CustomInfo;
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
export type ImageDisplayType = "block" | "inline" | "section";
// Корневой объект, который приходит с бэкенда
export interface Fb2ImageData {
  data: string;
  href: string;
  display: ImageDisplayType;
}

// Шаблон для новой книги
export const EMPTY_FB2_TEMPLATE: Fb2Data = {
  Meta: {
    TitleInfo: {
      Genres: ["antique"], // Обязательный тег для валидности FB2
      Authors: [
        {
          FirstName: "Безымянный автор",
          LastName: "Безымянный автор",
        },
      ],
      Title: "Новая книга",
      Lang: "ru",
    },
    DocumentInfo: {
      Authors: [
        {
          FirstName: "Безымянный автор",
          LastName: "Безымянный автор",
        },
      ],
      Program: "FB2 Editor",
      Date: new Date().toISOString().split("T")[0],
      DateValue: new Date().toISOString().split("T")[0],
      Id: crypto.randomUUID?.() || "", // Генерация уникального ID документа
      Version: "1.0",
    },
  },
  EditorContent: {
    type: "doc",
    content: [
      {
        type: "fb2BodySection",
        attrs: {
          level: 1,
          sectionId: crypto.randomUUID?.() || "",
        },
        content: [
          { type: "fb2Placeholder" },
          {
            type: "fb2Title",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Название книги" }],
              },
            ],
          },
          {
            type: "fb2Section",
            attrs: {
              level: 2,
              sectionId: crypto.randomUUID?.() || "",
            },
            content: [
              {
                type: "fb2Title",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Глава 1" }],
                  },
                ],
              },
              {
                type: "paragraph",
                content: [{ type: "text", text: "Начните писать здесь..." }],
              },
            ],
          },
        ],
      },
    ],
  },
  Footnotes: [],
  FilePath: "new_book.fb2",
};

// Список жанров
export const FB2_GENRES: { id: string; label: string }[] = [
  { id: "accounting", label: "Бухучет, налогообложение, аудит" },
  { id: "adv_animal", label: "Приключения про животных" },
  { id: "adv_geo", label: "Путешествия и география" },
  { id: "adv_history", label: "Исторические приключения" },
  { id: "adv_maritime", label: "Морские приключения" },
  { id: "adv_western", label: "Вестерн" },
  { id: "adventure", label: "Приключения: Прочее" },
  { id: "antique", label: "Старинная литература: Прочее" },
  { id: "antique_ant", label: "Античная литература" },
  { id: "antique_east", label: "Древневосточная литература" },
  { id: "antique_european", label: "Европейская старинная литература" },
  { id: "antique_myths", label: "Мифы. Легенды. Эпос" },
  { id: "antique_russian", label: "Древнерусская литература" },
  { id: "aphorism_quote", label: "Афоризмы, цитаты" },
  { id: "architecture_book", label: "Архитектура" },
  { id: "auto_regulations", label: "Автодело, ПДД" },
  { id: "banking", label: "Банковское дело" },
  { id: "beginning_authors", label: "Начинающие авторы" },
  { id: "child_adv", label: "Детские приключения" },
  { id: "child_det", label: "Детские детективы" },
  { id: "child_education", label: "Детская образовательная литература" },
  { id: "child_prose", label: "Детская проза" },
  { id: "child_sf", label: "Детская фантастика" },
  { id: "child_tale", label: "Сказка" },
  { id: "child_verse", label: "Детские стихи" },
  { id: "children", label: "Детская литература: Прочее" },
  { id: "cinema_theatre", label: "Кино и театр" },
  { id: "city_fantasy", label: "Городское фэнтези" },
  { id: "comp_db", label: "Базы данных" },
  { id: "comp_hard", label: "Компьютерное железо" },
  { id: "comp_osnet", label: "ОС и Сети" },
  { id: "comp_programming", label: "Программирование" },
  { id: "comp_soft", label: "Программное обеспечение" },
  { id: "comp_www", label: "Интернет и Web-дизайн" },
  { id: "computers", label: "Компьютеры: Прочее" },
  { id: "design", label: "Дизайн" },
  { id: "det_action", label: "Боевик" },
  { id: "det_classic", label: "Классический детектив" },
  { id: "det_crime", label: "Криминальный детектив" },
  { id: "det_espionage", label: "Шпионский детектив" },
  { id: "det_hard", label: "Крутой детектив" },
  { id: "det_history", label: "Исторический детектив" },
  { id: "det_irony", label: "Иронический детектив" },
  { id: "det_police", label: "Полицейский детектив" },
  { id: "det_political", label: "Политический детектив" },
  { id: "detective", label: "Детектив: Прочее" },
  { id: "dragon_fantasy", label: "Фэнтези про драконов" },
  { id: "dramaturgy", label: "Драматургия" },
  { id: "economics", label: "Экономика" },
  { id: "essays", label: "Эссе, очерки, этюды" },
  { id: "fantasy_fight", label: "Боевое фэнтези" },
  { id: "foreign_action", label: "Зарубежный боевик" },
  { id: "foreign_adventure", label: "Зарубежные приключения" },
  { id: "foreign_antique", label: "Зарубежная старинная литература" },
  { id: "foreign_business", label: "Зарубежная деловая литература" },
  { id: "foreign_children", label: "Зарубежная детская литература" },
  { id: "foreign_comp", label: "Зарубежная компьютерная литература" },
  { id: "foreign_contemporary", label: "Зарубежная современная проза" },
  { id: "foreign_contemporary_lit", label: "Зарубежная классика" },
  { id: "foreign_desc", label: "Зарубежная публицистика" },
  { id: "foreign_detective", label: "Зарубежный детектив" },
  { id: "foreign_dramaturgy", label: "Зарубежная драматургия" },
  { id: "foreign_edu", label: "Зарубежная учебная литература" },
  { id: "foreign_fantasy", label: "Зарубежное фэнтези" },
  { id: "foreign_home", label: "Зарубежное домоводство" },
  { id: "foreign_humor", label: "Зарубежный юмор" },
  { id: "foreign_language", label: "Изучение иностранных языков" },
  { id: "foreign_love", label: "Зарубежный любовный роман" },
  { id: "foreign_novel", label: "Зарубежный роман" },
  { id: "foreign_other", label: "Зарубежная литература: Прочее" },
  { id: "foreign_poetry", label: "Зарубежная поэзия" },
  { id: "foreign_prose", label: "Зарубежная проза" },
  { id: "foreign_psychology", label: "Зарубежная психология" },
  { id: "foreign_publicism", label: "Зарубежная публицистика" },
  { id: "foreign_religion", label: "Зарубежная религиозная литература" },
  { id: "foreign_sf", label: "Зарубежная фантастика" },
  { id: "geo_guides", label: "Путеводители" },
  { id: "geography_book", label: "География" },
  { id: "global_economy", label: "Внешнеэкономическая деятельность" },
  { id: "historical_fantasy", label: "Историческое фэнтези" },
  { id: "home", label: "Дом и семья: Прочее" },
  { id: "home_cooking", label: "Кулинария" },
  { id: "home_crafts", label: "Рукоделие" },
  { id: "home_diy", label: "Сделай сам" },
  { id: "home_entertain", label: "Развлечения" },
  { id: "home_garden", label: "Сад и огород" },
  { id: "home_health", label: "Здоровье" },
  { id: "home_pets", label: "Домашние животные" },
  { id: "home_sex", label: "Эротика, Секс" },
  { id: "home_sport", label: "Спорт, самооборона" },
  { id: "humor", label: "Юмор: Прочее" },
  { id: "humor_anecdote", label: "Анекдоты" },
  { id: "humor_fantasy", label: "Юмористическое фэнтези" },
  { id: "humor_prose", label: "Юмористическая проза" },
  { id: "humor_verse", label: "Юмористические стихи" },
  { id: "industries", label: "Отраслевые издания" },
  { id: "job_hunting", label: "Поиск работы, карьера" },
  { id: "literature_18", label: "Классическая литература XVIII века" },
  { id: "literature_19", label: "Классическая литература XIX века" },
  { id: "literature_20", label: "Классическая литература XX века" },
  { id: "love_contemporary", label: "Современный любовный роман" },
  { id: "love_detective", label: "Любовно-детективный роман" },
  { id: "love_erotica", label: "Эротика" },
  { id: "love_fantasy", label: "Любовное фэнтези" },
  { id: "love_history", label: "Исторический любовный роман" },
  { id: "love_sf", label: "Любовно-фантастический роман" },
  { id: "love_short", label: "Короткий любовный роман" },
  { id: "magician_book", label: "Магия, гадания, оккультизм" },
  { id: "management", label: "Управление, кадры" },
  { id: "marketing", label: "Маркетинг, PR, реклама" },
  { id: "military_special", label: "Военное дело" },
  { id: "music_dancing", label: "Музыка и танцы" },
  { id: "narrative", label: "Сказания, былины" },
  { id: "newspapers", label: "Газеты" },
  { id: "nonf_biography", label: "Биографии и мемуары" },
  { id: "nonf_criticism", label: "Критика" },
  { id: "nonf_publicism", label: "Публицистика" },
  { id: "nonfiction", label: "Документальная литература" },
  { id: "org_behavior", label: "Корпоративная культура" },
  { id: "paper_work", label: "Делопроизводство" },
  { id: "pedagogy_book", label: "Педагогика" },
  { id: "periodic", label: "Периодика" },
  { id: "personal_finance", label: "Личные финансы" },
  { id: "poetry", label: "Поэзия" },
  { id: "popadanec", label: "Попаданцы" },
  { id: "popular_business", label: "Популярно о бизнесе" },
  { id: "prose_classic", label: "Классическая проза" },
  { id: "prose_counter", label: "Контркультура" },
  { id: "prose_history", label: "Историческая проза" },
  { id: "prose_military", label: "Военная проза" },
  { id: "prose_rus_classic", label: "Русская классическая проза" },
  { id: "prose_su_classics", label: "Советская классическая проза" },
  { id: "psy_alassic", label: "Классическая психология" },
  { id: "psy_childs", label: "Детская психология" },
  { id: "psy_generic", label: "Общая психология" },
  { id: "psy_personal", label: "Личностный рост" },
  { id: "psy_sex_and_family", label: "Психология семьи" },
  { id: "psy_social", label: "Социальная психология" },
  { id: "psy_theraphy", label: "Психотерапия" },
  { id: "real_estate", label: "Недвижимость" },
  { id: "ref_dict", label: "Словари" },
  { id: "ref_encyc", label: "Энциклопедии" },
  { id: "ref_guide", label: "Справочники" },
  { id: "ref_ref", label: "Рефераты" },
  { id: "reference", label: "Справочная литература: Прочее" },
  { id: "religion", label: "Религия: Прочее" },
  { id: "religion_esoterics", label: "Эзотерика" },
  { id: "religion_rel", label: "Религиоведение" },
  { id: "religion_self", label: "Самосовершенствование" },
  { id: "russian_contemporary", label: "Современная русская проза" },
  { id: "russian_fantasy", label: "Русское фэнтези" },
  { id: "sci_biology", label: "Биология" },
  { id: "sci_chem", label: "Химия" },
  { id: "sci_culture", label: "Культурология" },
  { id: "sci_history", label: "История" },
  { id: "sci_juris", label: "Юриспруденция" },
  { id: "sci_linguistic", label: "Языкознание" },
  { id: "sci_math", label: "Математика" },
  { id: "sci_medicine", label: "Медицина" },
  { id: "sci_philosophy", label: "Философия" },
  { id: "sci_phys", label: "Физика" },
  { id: "sci_politics", label: "Политика" },
  { id: "sci_religion", label: "Религиоведение (научное)" },
  { id: "sci_tech", label: "Технические науки" },
  { id: "science", label: "Научная литература: Прочее" },
  { id: "sf", label: "Научная фантастика" },
  { id: "sf_action", label: "Боевая фантастика" },
  { id: "sf_cyberpunk", label: "Киберпанк" },
  { id: "sf_detective", label: "Фантастический детектив" },
  { id: "sf_fantasy", label: "Фэнтези" },
  { id: "sf_heroic", label: "Героическая фантастика" },
  { id: "sf_history", label: "Альтернативная история" },
  { id: "sf_horror", label: "Ужасы и Мистика" },
  { id: "sf_humor", label: "Юмористическая фантастика" },
  { id: "sf_social", label: "Социально-психологическая фантастика" },
  { id: "sf_space", label: "Космическая фантастика" },
  { id: "short_story", label: "Малая проза" },
  { id: "sketch", label: "Очерк" },
  { id: "small_business", label: "Малый бизнес" },
  { id: "sociology_book", label: "Социология" },
  { id: "stock", label: "Ценные бумаги, инвестиции" },
  { id: "thriller", label: "Триллер" },
  { id: "upbringing_book", label: "Воспитание детей" },
  { id: "vampire_book", label: "Книги про вампиров" },
  { id: "visual_arts", label: "Изобразительное искусство" },
  { id: "unrecognised", label: "Нераспознанное" },
];

// Языки
export const LANGUAGES = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "uk", label: "Українська" },
  { value: "be", label: "Беларуская" },
];

// Команды в тулбаре
export const COMMAND_NAMES = [
  "Title",
  "Epigraph",
  "TextAuthor",
  "Subtitle",
  "Poem",
  "Stanza",
  "Annotation",
  "Date",
  "InlineImage",
  "BlockImage",
  "SectionImage",
  "Section",
] as const;

export type Capabilities = {
  [K in (typeof COMMAND_NAMES)[number]as
  | `canInsert${K}`
  | `canRemove${K}`]: boolean;
};

// Специфические атрибуты для разных узлов
type Fb2NodeAttrs = {
  InlineImage: { src: string; href?: string };
  BlockImage: { src: string; title?: string; href?: string }; 
  SectionImage: { src: string; title?: string; href?: string }; 
};

// Умный тип для аргументов команд
export type Fb2Commands<ReturnType> = {
  // Генерация insert-команд
  [K in (typeof COMMAND_NAMES)[number]as `insertFb2${K}`]:
  K extends keyof Fb2NodeAttrs
  ? (attributes: Fb2NodeAttrs[K]) => ReturnType
  : () => ReturnType;
} & {
  // Генерация remove-команд (обычно без аргументов)
  [K in (typeof COMMAND_NAMES)[number]as `removeFb2${K}`]: () => ReturnType;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fb2: Fb2Commands<ReturnType>;
  }
}