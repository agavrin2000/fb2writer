"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  memo,
  useMemo,
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
import {
  FB2_GENRES,
  LANGUAGES,
  Fb2Metadata,
} from "../../../types/types";
import { debounce } from "../../../utils/utils";
import { Editor, useEditorState } from "@tiptap/react";
import { JSONContent } from "@tiptap/core";

const formatDateForInput = (dateStr: string | undefined) => {
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

    // 1. Источник истины из редактора (синхронизируется при Undo/Redo)
    const meta = useEditorState({
      editor,
      selector: (ctx) => ctx.editor?.storage.metadata.meta as Fb2Metadata,
    });
    // ------------------------------------------------

    // 3. Стабильная функция обновления редактора с дебаунсом
    const debouncedUpdate = useMemo(() => {
      return debounce((next: Fb2Metadata) => {
        // Выполняем команду обновления в редакторе
        editor?.chain().updateMetadata(next).setMeta("metadataUpdated", true).run();
      }, 500);
    }, [editor]);

    // Очистка при размонтировании
    useEffect(() => debouncedUpdate.cancel(), [debouncedUpdate]);

    const handleMetaUpdate = useCallback((
      section: keyof Fb2Metadata,
      field: string,
      newValue: JSONContent | string | number | boolean | null | unknown[],
      immediate = false // по умолчанию используем дебаунс
    ) => {
      if (!meta) return;

      const next = {
        ...meta,
        [section]: { ...meta[section], [field]: newValue },
      } as Fb2Metadata;

      if (immediate) {
        debouncedUpdate.cancel(); // Отменяем запланированные хвосты, если шлем мгновенно
        editor?.chain().updateMetadata(next).setMeta("metadataUpdated", true).run();
      } else {
        debouncedUpdate(next);
      }
    }, [debouncedUpdate, meta, editor]);

    const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

    const markAsTouched = useCallback((section: string, field: string) => {
      const key = `${section}.${field}`;
      setTouchedFields((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    }, []);

    // Универсальная функция валидации
    const getFieldError = (section: keyof Fb2Metadata, field: string, value: string | null | undefined) => {
      if (section === "srcTitleInfo" && field === "title" && !value) {
        return "Название обязательно для заполнения";
      }
      if (section === "documentInfo" && field === "version" && !value) {
        return "Версия обязательна для заполнения";
      }
      if (section === "documentInfo" && field === "id" && !value) {
        return "ID документа обязателен для заполнения";
      }
      return "";
    };

    if (!editor) return null;
    // Безопасный доступ к веткам JSON (теперь берем из meta от редактора)
    // В инпутах используйте localMeta
    const titleInfo = meta?.titleInfo;
    const srctitleInfo = meta?.srcTitleInfo;
    const publishInfo = meta?.publishInfo;
    const docInfo = meta?.documentInfo;
    const customInfo = meta?.customInfo;

    //if (!meta) return <div>Загрузка...</div>;
    const generateUUID = () => {
      // Генерируем стандартный UUID v4
      const newId = crypto.randomUUID();
      handleMetaUpdate("documentInfo", "id", newId);
    };
    return (
      <div
        className="relative flex h-full select-none shrink-0"
      //onKeyDown={handleKeyDown}
      >
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
            <div className="p-4 flex items-center gap-3">
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
                        defaultValue={titleInfo?.title}
                        icon={BookOpen}
                        required={true}
                        error={getFieldError("titleInfo", "title", titleInfo?.title)}
                        touched={touchedFields["titleInfo.title"]}
                        onChange={(val) => handleMetaUpdate("titleInfo", "title", val)}
                        onBlur={() => markAsTouched("titleInfo", "title")}
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
                        defaultValue={titleInfo?.lang}
                        icon={Languages}
                        options={LANGUAGES}
                        required={true}
                        error={getFieldError("titleInfo", "lang", titleInfo?.lang)}
                        touched={touchedFields["titleInfo.lang"]}
                        onChange={(val) => handleMetaUpdate("titleInfo", "lang", val)}
                        onBlur={() => markAsTouched("titleInfo", "lang")}
                      />
                      <Field
                        label="Язык оригигинала"
                        defaultValue={titleInfo?.srcLang}
                        icon={Languages}
                        options={LANGUAGES}
                        touched={touchedFields["titleInfo.srcLang"]}
                        onChange={(val) => handleMetaUpdate("titleInfo", "srcLang", val)}
                        onBlur={() => markAsTouched("titleInfo", "srcLang")}
                      />
                      <Field
                        label="Ключевые слова"
                        defaultValue={titleInfo?.keywords}
                        icon={Hash}
                        multiline
                        rows={2}
                        touched={touchedFields["titleInfo.keywords"]}
                        onChange={(val) => handleMetaUpdate("titleInfo", "keywords", val)}
                        onBlur={() => markAsTouched("titleInfo", "keywords")}
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
                          handleMetaUpdate("titleInfo", "genres", newGenres, true)
                        }
                        availableGenres={FB2_GENRES}
                      />
                    </Section>

                    <Section
                      title={`Авторы (${titleInfo?.authors?.length ?? 0})`}
                      icon={User}
                      className="mt-4"
                      defaultOpen={false}
                    >
                      <PersonList
                        title="Автор"
                        items={titleInfo?.authors || []}
                        onUpdate={(newAuthors, immediate) =>
                          handleMetaUpdate("titleInfo", "authors", newAuthors, immediate ?? false)
                        }
                      />
                    </Section>

                    <Section
                      title={`Переводчики (${titleInfo?.translators?.length ?? 0})`}
                      icon={User}
                      className="mt-4"
                      defaultOpen={false}
                    >
                      <PersonList
                        title="Переводчик"
                        items={titleInfo?.translators || []}
                        onUpdate={(newTranslators, immediate) =>
                          handleMetaUpdate(
                            "titleInfo",
                            "translators",
                            newTranslators, immediate ?? false
                          )
                        }
                      />
                    </Section>

                    <Section
                      title={`Серии (${titleInfo?.sequence?.length ?? 0})`}
                      icon={Hash}
                      className="mt-4"
                      defaultOpen={false}
                    >
                      <SequenceList
                        items={titleInfo?.sequence || []}
                        onUpdate={(newSeqs, immediate) =>
                          handleMetaUpdate("titleInfo", "sequence", newSeqs, immediate ?? false)
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
                      title="Оригинальное произведение"
                      icon={BookOpen}
                      defaultOpen={true}
                    >
                      <Field
                        label="Название книги"
                        defaultValue={srctitleInfo?.title}
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
                        defaultValue={srctitleInfo?.lang}
                        icon={Languages}
                        options={LANGUAGES}
                        onChange={(val) =>
                          handleMetaUpdate("srcTitleInfo", "lang", val)
                        }
                      />
                      <Field
                        label="Язык оригигинала"
                        defaultValue={srctitleInfo?.srcLang}
                        icon={Languages}
                        options={LANGUAGES}
                        onChange={(val) =>
                          handleMetaUpdate("srcTitleInfo", "srcLang", val)
                        }
                      />
                      <Field
                        label="Ключевые слова"
                        defaultValue={titleInfo?.keywords}
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
                          handleMetaUpdate("titleInfo", "genres", newGenres, true)
                        }
                        availableGenres={FB2_GENRES}
                      />
                    </Section>

                    <Section
                      title={`Авторы (${srctitleInfo?.authors?.length ?? 0})`}
                      icon={User}
                      className="mt-4"
                      defaultOpen={false}
                    >
                      <PersonList
                        title="Автор"
                        items={srctitleInfo?.authors || []}
                        onUpdate={(newAuthors, immediate) =>
                          handleMetaUpdate(
                            "srcTitleInfo",
                            "authors",
                            newAuthors,immediate ?? false
                          )
                        }
                      />
                    </Section>

                    <Section
                      title={`Переводчики (${srctitleInfo?.translators?.length ?? 0})`}
                      icon={User}
                      className="mt-4"
                      defaultOpen={false}
                    >
                      <PersonList
                        title="Переводчик"
                        items={srctitleInfo?.translators || []}
                        onUpdate={(newTranslators,immediate) =>
                          handleMetaUpdate(
                            "srcTitleInfo",
                            "translators",
                            newTranslators,
                            immediate ?? false
                          )
                        }
                      />
                    </Section>

                    <Section
                      title={`Серии (${srctitleInfo?.sequence?.length ?? 0})`}
                      icon={Hash}
                      className="mt-4"
                      defaultOpen={false}
                    >
                      <SequenceList
                        items={srctitleInfo?.sequence || []}
                        onUpdate={(newSeqs,immediate) =>
                          handleMetaUpdate("srcTitleInfo", "sequence", newSeqs, immediate ?? false)
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
                        defaultValue={publishInfo?.bookName}
                        onChange={(val) =>
                          handleMetaUpdate("publishInfo", "bookName", val)
                        }
                      />
                      <Field
                        label="Издатель"
                        defaultValue={publishInfo?.publisher}
                        icon={Printer}
                        onChange={(val) =>
                          handleMetaUpdate("publishInfo", "publisher", val)
                        }
                      />
                      <Field label="Город" defaultValue={publishInfo?.city} />
                      <Field
                        label="Год издания"
                        defaultValue={publishInfo?.year}
                        icon={Calendar}
                        onChange={(val) =>
                          handleMetaUpdate("publishInfo", "year", val)
                        }
                      />
                      <Field
                        label="ISBN"
                        defaultValue={publishInfo?.isbn}
                        icon={ShieldCheck}
                        onChange={(val) =>
                          handleMetaUpdate("publishInfo", "isbn", val)
                        }
                      />
                    </Section>

                    <Section
                      title={`Серии (${publishInfo?.sequence?.length ?? 0})`}
                      icon={Hash}
                      className="mt-4"
                      defaultOpen={false}
                    >
                      <SequenceList
                        items={publishInfo?.sequence || []}
                        onUpdate={(newSeqs,immediate) =>
                          handleMetaUpdate("publishInfo", "sequence", newSeqs, immediate ?? false)
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
                        defaultValue={docInfo?.id}
                        required={true}
                        error={getFieldError("documentInfo", "id", docInfo?.id)}
                        touched={touchedFields["docInfo.id"]}
                        onBlur={() => markAsTouched("documentInfo", "id")}
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
                        defaultValue={docInfo?.version}
                        required={true}
                        error={getFieldError("documentInfo", "id", docInfo?.version)}
                        touched={touchedFields["docInfo.version"]}
                        onChange={(val) =>
                          handleMetaUpdate("documentInfo", "version", val)
                        }
                      />
                      <Field
                        label="Программа"
                        defaultValue={docInfo?.program}
                        onChange={(val) =>
                          handleMetaUpdate("documentInfo", "program", val)
                        }
                      />
                      <Field
                        label="Дата создания файла"
                        defaultValue={formatDateForInput(docInfo?.date)}
                        type="date"
                        required={true}
                        error={getFieldError("documentInfo", "id", docInfo?.date)}
                        touched={touchedFields["docInfo.date"]}
                        icon={Calendar}
                        onChange={(val) =>
                          handleMetaUpdate("documentInfo", "date", val)
                        }
                      />
                    </Section>

                    <Section
                      title={`Авторы документа (${docInfo?.authors?.length ?? 0})`}
                      icon={User}
                      className="mt-4"
                      defaultOpen={false}
                    >
                      <PersonList
                        title="Автор"
                        items={docInfo?.authors || []}
                        onUpdate={(newAuthors, immediate) =>
                          handleMetaUpdate(
                            "documentInfo",
                            "authors",
                            newAuthors,
                            immediate ?? false
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
                        defaultValue={docInfo?.srcUrl}
                        icon={Link}
                        onChange={(val) =>
                          handleMetaUpdate("documentInfo", "srcUrl", val)
                        }
                      />
                      <Field
                        label="Автор OCR"
                        defaultValue={docInfo?.srcOcr}
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
                        onUpdate={(newItems, immediate) =>
                          handleMetaUpdate(
                            "customInfo",
                            "customItems",
                            newItems,
                            immediate ?? false
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
    className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all border-b-2 ${active
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
