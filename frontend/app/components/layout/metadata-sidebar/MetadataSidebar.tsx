"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  memo,
  useMemo,
  useRef,
} from "react";
import {
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Printer,
  FileText,
  User,
  Tag,
  Calendar,
  Hash,
  History,
  Link,
  ShieldCheck,
  Info,
  TextQuote,
  Languages,
  Dices,
} from "lucide-react";
import { Field } from "./Field";
import { PersonList } from "./PersonList";
import { Section } from "./Section";
import { SequenceList } from "./SequenceList";
import { GenreList } from "./GenreList";
import { CustomInfoList } from "./CustomInfoList";
import { RichTextEditor } from "./RichTextEditor";
import { CoverPicker } from "./CoverPicker";
import { FB2_GENRES, LANGUAGES, Fb2Metadata, TiptapContent } from "@/types/types";
import { debounce } from "@/utils/utils";
import { Editor, useEditorState } from "@tiptap/react";

const formatDateForInput = (dateStr: string) => {
  if (!dateStr) return "";
  // Если дата уже YYYY-MM-DD, вернет её, иначе попробует преобразовать
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
};

export const MetadataSidebar = memo(
  ({
    editor,
    isOpen,
    onToggle,
  }: {
    editor: Editor | null;
    isOpen: boolean;
    onToggle: () => void;
  }) => {
    const [activeTab, setActiveTab] = useState<
      "title" | "src-title" | "publish" | "custom" | "doc"
    >("title");

    // 1. Подписываемся ТОЛЬКО на изменения метаданных в хранилище.
    // Это предотвратит лишние рендеры при печати текста в самом редакторе.
    const meta = useEditorState({
      editor,
      selector: (ctx) => ctx.editor?.storage.metadata.meta as Fb2Metadata,
    });

    const [localMeta, setLocalMeta] = useState<Fb2Metadata | null>(meta);

    // Реф для хранения последнего отправленного состояния, чтобы избежать "эха"
    const lastSentMetaRef = useRef<string>("");

    // 2. Синхронизация из редактора в сайдбар (для Undo/Redo)
    const [prevMeta, setPrevMeta] = useState(meta);

    // 1. Синхронизируем стейт
    // 1. Вместо useRef для lastSentMeta, используем useState
    const [lastSentMetaString, setLastSentMetaString] = useState<string>(
      JSON.stringify(meta),
    );

    if (meta !== prevMeta) {
      setPrevMeta(meta);

      const incomingMetaString = JSON.stringify(meta);

      // Если пришедшие данные не совпадают с тем, что мы сами отправили
      // (значит, это Undo/Redo или внешняя загрузка)
      if (incomingMetaString !== lastSentMetaString) {
        setLocalMeta(meta);
        setLastSentMetaString(incomingMetaString);
      }
    }

    // 2. Синхронизируем реф (в эффекте, так как это побочное действие)
    useEffect(() => {
      lastSentMetaRef.current = JSON.stringify(meta);
    }, [meta]);

    // 1. Указываем правильный тип (функция + метод cancel)

    // 1. Создаем стабильную дебаунс-функцию через useMemo
    const debouncedUpdate = useMemo(() => {
      return debounce((next: Fb2Metadata) => {
        const nextString = JSON.stringify(next);
        // Обновляем "предохранитель", чтобы не было эха
        setLastSentMetaString(nextString);
        editor?.commands.updateMetadata(next);
      }, 500);
    }, [editor]); // Пересоздаем, только если сменился экземпляр редактора

    // 2. Очищаем дебаунс при размонтировании
    useEffect(() => {
      return () => {
        debouncedUpdate.cancel();
      };
    }, [debouncedUpdate]);

    // 3. В обработчике вызываем напрямую
    const handleMetaUpdate = useCallback(
      (
        section: keyof Fb2Metadata,
        field: string,
        // Добавляем поддержку массивов (any[] или конкретнее string[] | Fb2Person[])
        newValue: TiptapContent | string | number | boolean | null | unknown[],
      ) => {
        setLocalMeta((prev) => {
          if (!prev || !prev[section]) return prev;

          const sectionData = prev[section] as unknown as Record<
            string,
            unknown
          >;

          // Для массивов простая проверка === не всегда работает,
          // но для предотвращения лишних дебаунсов этого обычно достаточно
          if (sectionData[field] === newValue) return prev;

          const next: Fb2Metadata = {
            ...prev,
            [section]: {
              ...sectionData,
              [field]: newValue,
            },
          } as Fb2Metadata;

          debouncedUpdate(next);
          return next;
        });
      },
      [debouncedUpdate],
    );

    if (!editor) return null;
    // Безопасный доступ к веткам JSON (теперь берем из meta от редактора)
    // В инпутах используйте localMeta
    const titleInfo = localMeta?.titleInfo;
    const srctitleInfo = localMeta?.srcTitleInfo;
    const publishInfo = localMeta?.publishInfo;
    const docInfo = localMeta?.documentInfo;
    const customInfo = localMeta?.customInfo;

    //if (!meta) return <div>Загрузка...</div>;
    const generateUUID = () => {
      // Генерируем стандартный UUID v4
      const newId = crypto.randomUUID();
      handleMetaUpdate("documentInfo", "id", newId);
    };
    return (
      <div className="relative flex h-full select-none shrink-0">
        {/* Кнопка открытия (Плавающая справа, когда закрыто) */}
        {!isOpen && (
          <button
            type="button"
            onClick={onToggle}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-white border border-gray-200 border-r-0 p-2 rounded-l-xl shadow-lg hover:bg-blue-50 text-blue-600 transition-all animate-in slide-in-from-right duration-200"
            title="Открыть метаданные"
          >
            <ChevronLeft size={20} strokeWidth={3} />
          </button>
        )}

        {/* Основной контейнер сайдбара */}
        <aside
          className={`
                relative flex flex-col border-l bg-gray-50 shadow-xl z-40 transition-all duration-300
                ${isOpen ? "w-80 opacity-100" : "w-0 opacity-0 overflow-hidden"}
            `}
        >
          {/* Шапка и Вкладки */}
          <div className="flex flex-col bg-white border-b min-w-[320px]">
            <div className="p-4 flex justify-between items-center">
              <button
                type="button"
                title="Скрыть метаданные"
                onClick={onToggle}
                className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Описание FB2
              </span>
              <Info size={16} className="text-gray-300" />
            </div>

            <div className="flex px-2 border-t">
              <TabButton
                active={activeTab === "title"}
                onClick={() => setActiveTab("title")}
                label="Title"
                icon={<BookOpen size={12} />}
              />
              <TabButton
                active={activeTab === "src-title"}
                onClick={() => setActiveTab("src-title")}
                label="Src-Title"
                icon={<BookOpen size={12} />}
              />
              <TabButton
                active={activeTab === "publish"}
                onClick={() => setActiveTab("publish")}
                label="Publish"
                icon={<Printer size={12} />}
              />
              <TabButton
                active={activeTab === "doc"}
                onClick={() => setActiveTab("doc")}
                label="Doc"
                icon={<FileText size={12} />}
              />
              <TabButton
                active={activeTab === "custom"}
                onClick={() => setActiveTab("custom")}
                label="Custom"
                icon={<FileText size={12} />}
              />
            </div>
          </div>

          {/* Контентная область */}
          <div className="grow overflow-y-auto p-4 custom-scrollbar min-w-[320px]">
            {!meta ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span className="text-[11px] italic">Ожидание данных...</span>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Вкладка 1: Title-Info */}
                {activeTab === "title" && (
                  <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                    <Section
                      title="Произведение"
                      icon={BookOpen}
                      defaultOpen={true}
                    >
                      <Field
                        label="Название книги"
                        value={titleInfo?.title}
                        icon={BookOpen}
                        onChange={(val) =>
                          handleMetaUpdate("titleInfo", "title", val)
                        }
                      />
                      {/* Блок обложки */}
                      <CoverPicker
                        value={titleInfo?.coverPage}
                        onUpdate={(base64) =>
                          handleMetaUpdate("titleInfo", "coverPage", base64)
                        }
                      />

                      <Field
                        label="Язык книги"
                        value={titleInfo?.lang}
                        icon={Languages}
                        options={LANGUAGES}
                        onChange={(val) =>
                          handleMetaUpdate("titleInfo", "lang", val)
                        }
                      />
                      <Field
                        label="Язык оригигинала"
                        value={titleInfo?.srcLang}
                        icon={Languages}
                        options={LANGUAGES}
                        onChange={(val) =>
                          handleMetaUpdate("titleInfo", "srcLang", val)
                        }
                      />
                      <Field
                        label="Ключевые слова"
                        value={titleInfo?.keywords}
                        icon={Hash}
                        multiline
                        rows={2}
                        onChange={(val) =>
                          handleMetaUpdate("titleInfo", "keywords", val)
                        }
                      />
                    </Section>

                    <Section
                      title={`Жанры (${titleInfo?.genres?.length ?? 0})`}
                      icon={Tag}
                      className="mt-4"
                      defaultOpen={false}
                    >
                      <GenreList
                        genres={titleInfo?.genres || []}
                        onUpdate={(newGenres) =>
                          handleMetaUpdate("titleInfo", "genres", newGenres)
                        }
                        availableGenres={FB2_GENRES}
                      />
                    </Section>

                    <Section
                      title="Авторы"
                      icon={User}
                      className="mt-4"
                      defaultOpen={false}
                    >
                      <PersonList
                        title="Автор"
                        items={titleInfo?.authors || []}
                        onUpdate={(newAuthors) =>
                          handleMetaUpdate("titleInfo", "authors", newAuthors)
                        }
                      />
                    </Section>

                    <Section
                      title="Переводчики"
                      icon={User}
                      className="mt-4"
                      defaultOpen={false}
                    >
                      <PersonList
                        title="Автор"
                        items={titleInfo?.translators || []}
                        onUpdate={(newTranslators) =>
                          handleMetaUpdate(
                            "titleInfo",
                            "translators",
                            newTranslators,
                          )
                        }
                      />
                    </Section>

                    <Section
                      title="Серия"
                      icon={Hash}
                      className="mt-4"
                      defaultOpen={false}
                    >
                      <SequenceList
                        items={titleInfo?.sequence || []}
                        onUpdate={(newSeqs) =>
                          handleMetaUpdate("titleInfo", "sequence", newSeqs)
                        }
                      />
                    </Section>

                    <Section
                      title="Аннотация"
                      icon={TextQuote}
                      className="mt-4"
                      defaultOpen={false}
                    >
                      <RichTextEditor
                        content={titleInfo?.annotation ?? null}
                        onChange={(newJson) =>
                          handleMetaUpdate("titleInfo", "annotation", newJson)
                        }
                      />
                    </Section>
                  </div>
                )}
                {/* Вкладка 1: SrcTitle-Info */}
                {activeTab === "src-title" && (
                  <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                    <Section
                      title="Произведение (язык оригинала)"
                      icon={BookOpen}
                      defaultOpen={true}
                    >
                      <Field
                        label="Название книги"
                        value={srctitleInfo?.title}
                        icon={BookOpen}
                        onChange={(val) =>
                          handleMetaUpdate("srcTitleInfo", "title", val)
                        }
                      />
                      {/* Блок обложки */}
                      <CoverPicker
                        value={srctitleInfo?.coverPage}
                        onUpdate={(base64) =>
                          handleMetaUpdate("titleInfo", "coverPage", base64)
                        }
                      />
                      <Field
                        label="Язык книги"
                        value={srctitleInfo?.lang}
                        icon={Languages}
                        options={LANGUAGES}
                        onChange={(val) =>
                          handleMetaUpdate("srcTitleInfo", "lang", val)
                        }
                      />
                      <Field
                        label="Язык оригигинала"
                        value={srctitleInfo?.srcLang}
                        icon={Languages}
                        options={LANGUAGES}
                        onChange={(val) =>
                          handleMetaUpdate("srcTitleInfo", "srcLang", val)
                        }
                      />
                      <Field
                        label="Ключевые слова"
                        value={titleInfo?.keywords}
                        icon={Hash}
                        multiline
                        rows={2}
                        onChange={(val) =>
                          handleMetaUpdate("srcTitleInfo", "keywords", val)
                        }
                      />
                    </Section>

                    <Section
                      title={`Жанры (${srctitleInfo?.genres?.length ?? 0})`}
                      icon={Tag}
                      defaultOpen={true}
                    >
                      <GenreList
                        genres={srctitleInfo?.genres ?? []}
                        onUpdate={(newGenres) =>
                          handleMetaUpdate("titleInfo", "genres", newGenres)
                        }
                        availableGenres={FB2_GENRES}
                      />
                    </Section>

                    <Section
                      title="Авторы"
                      icon={User}
                      className="mt-4"
                      defaultOpen={false}
                    >
                      <PersonList
                        title="Автор"
                        items={srctitleInfo?.authors || []}
                        onUpdate={(newAuthors) =>
                          handleMetaUpdate(
                            "srcTitleInfo",
                            "authors",
                            newAuthors,
                          )
                        }
                      />
                    </Section>

                    <Section
                      title="Переводчики"
                      icon={User}
                      className="mt-4"
                      defaultOpen={false}
                    >
                      <PersonList
                        title="Автор"
                        items={srctitleInfo?.translators || []}
                        onUpdate={(newTranslators) =>
                          handleMetaUpdate(
                            "srcTitleInfo",
                            "translators",
                            newTranslators,
                          )
                        }
                      />
                    </Section>

                    <Section
                      title="Серия"
                      icon={Hash}
                      className="mt-4"
                      defaultOpen={false}
                    >
                      <SequenceList
                        items={srctitleInfo?.sequence || []}
                        onUpdate={(newSeqs) =>
                          handleMetaUpdate("srcTitleInfo", "sequence", newSeqs)
                        }
                      />
                    </Section>
                    <Section
                      title="Аннотация"
                      icon={TextQuote}
                      className="mt-4"
                      defaultOpen={false}
                    >
                      <RichTextEditor
                        content={srctitleInfo?.annotation ?? null}
                        onChange={(newJson) =>
                          handleMetaUpdate(
                            "srcTitleInfo",
                            "annotation",
                            newJson,
                          )
                        }
                      />
                    </Section>
                  </div>
                )}

                {/* Вкладка 2: Publish-Info */}
                {activeTab === "publish" && (
                  <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                    <Section
                      title="Издательство"
                      icon={Printer}
                      defaultOpen={true}
                    >
                      <Field
                        label="Название книги"
                        value={publishInfo?.bookName}
                        onChange={(val) =>
                          handleMetaUpdate("publishInfo", "bookName", val)
                        }
                      />
                      <Field
                        label="Издатель"
                        value={publishInfo?.publisher}
                        icon={Printer}
                        onChange={(val) =>
                          handleMetaUpdate("publishInfo", "publisher", val)
                        }
                      />
                      <Field label="Город" value={publishInfo?.city} />
                      <Field
                        label="Год издания"
                        value={publishInfo?.year}
                        icon={Calendar}
                        onChange={(val) =>
                          handleMetaUpdate("publishInfo", "year", val)
                        }
                      />
                      <Field
                        label="ISBN"
                        value={publishInfo?.isbn}
                        icon={ShieldCheck}
                        onChange={(val) =>
                          handleMetaUpdate("publishInfo", "isbn", val)
                        }
                      />
                    </Section>

                    <Section
                      title="Серия"
                      icon={Hash}
                      className="mt-4"
                      defaultOpen={false}
                    >
                      <SequenceList
                        items={publishInfo?.sequence || []}
                        onUpdate={(newSeqs) =>
                          handleMetaUpdate("publishInfo", "sequence", newSeqs)
                        }
                      />
                    </Section>
                  </div>
                )}

                {/* Вкладка 3: Document-Info */}
                {activeTab === "doc" && (
                  <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                    <Section
                      title="Информация о файле"
                      icon={FileText}
                      defaultOpen={true}
                    >
                      <Field
                        label="ID Документа"
                        value={docInfo?.id}
                        onChange={(val) =>
                          handleMetaUpdate("documentInfo", "id", val)
                        }
                        action={{
                          icon: Dices,
                          onClick: generateUUID,
                          title: "Сгенерировать уникальный ID",
                        }}
                      />
                      <Field
                        label="Версия"
                        value={docInfo?.version}
                        onChange={(val) =>
                          handleMetaUpdate("documentInfo", "version", val)
                        }
                      />
                      <Field
                        label="Программа"
                        value={docInfo?.program}
                        onChange={(val) =>
                          handleMetaUpdate("documentInfo", "program", val)
                        }
                      />
                      <Field
                        label="Дата создания файла"
                        value={formatDateForInput(meta.documentInfo?.date)}
                        type="date"
                        icon={Calendar}
                        onChange={(val) =>
                          handleMetaUpdate("documentInfo", "date", val)
                        }
                      />
                    </Section>

                    <Section
                      title="Авторы документа"
                      icon={User}
                      className="mt-4"
                      defaultOpen={false}
                    >
                      <PersonList
                        title="Автор"
                        items={docInfo?.authors || []}
                        onUpdate={(newAuthors) =>
                          handleMetaUpdate(
                            "documentInfo",
                            "authors",
                            newAuthors,
                          )
                        }
                      />
                    </Section>

                    <Section
                      title="OCR / Источник"
                      icon={Link}
                      className="mt-4"
                      defaultOpen={false}
                    >
                      <Field
                        label="Source URL"
                        value={docInfo?.srcUrl}
                        icon={Link}
                        onChange={(val) =>
                          handleMetaUpdate("documentInfo", "srcUrl", val)
                        }
                      />
                      <Field
                        label="Автор OCR"
                        value={docInfo?.srcOcr}
                        icon={Link}
                        onChange={(val) =>
                          handleMetaUpdate("documentInfo", "srcOcr", val)
                        }
                      />
                    </Section>

                    <Section
                      title="История изменений"
                      icon={History}
                      className="mt-4"
                      defaultOpen={false}
                    >
                      <RichTextEditor
                        content={docInfo?.history ?? null}
                        onChange={(newJson) =>
                          handleMetaUpdate("documentInfo", "history", newJson)
                        }
                      />
                    </Section>
                  </div>
                )}

                {/* Вкладка 3: Custom-Info */}
                {activeTab === "custom" && (
                  <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                    <Section
                      title="Прочая информация"
                      icon={FileText}
                      defaultOpen={true}
                    >
                      <CustomInfoList
                        items={customInfo?.customItems || []}
                        onUpdate={(newItems) =>
                          handleMetaUpdate(
                            "customInfo",
                            "customItems",
                            newItems,
                          )
                        }
                      />
                    </Section>

                    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-[10px] text-blue-600 italic">
                      Здесь хранятся нестандартные теги, такие как ISBN,
                      идентификаторы магазинов или технические пометки.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    );
  },
);

// --- Вспомогательные компоненты ---
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}

const TabButton = ({ active, onClick, label, icon }: TabButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all border-b-2 ${
      active
        ? "border-blue-600 text-blue-600 bg-blue-50/50"
        : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
    }`}
  >
    {icon}
    <span className="text-[9px] font-bold uppercase tracking-tighter">
      {label}
    </span>
  </button>
);

MetadataSidebar.displayName = "MetadataSidebar";
