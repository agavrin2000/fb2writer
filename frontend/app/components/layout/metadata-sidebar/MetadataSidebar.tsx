"use client";
import React, { useState, useMemo, useEffect, useCallback, memo } from "react";
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
import { FB2_GENRES, LANGUAGES, Fb2Metadata } from "@/types/types";
import { debounce } from "@/utils/utils";

interface MetadataSidebarProps {
  meta: Fb2Metadata | null;
  onMetaChange: (newMeta: Fb2Metadata | null) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const MetadataSidebar = memo(
  ({ meta, onMetaChange, isOpen, onToggle }: MetadataSidebarProps) => {
    const [activeTab, setActiveTab] = useState<
      "title" | "src-title" | "publish" | "custom" | "doc"
    >("title");
    const [localMeta, setLocalMeta] = useState<Fb2Metadata | null>(meta);

    // Безопасный доступ к веткам JSON
    const titleInfo = localMeta?.titleInfo;
    const srctitleInfo = localMeta?.srcTitleInfo;
    const publishInfo = localMeta?.publishInfo;
    const docInfo = localMeta?.documentInfo;
    const customInfo = localMeta?.customInfo;

    const formatDateForInput = (dateStr: string) => {
      if (!dateStr) return "";
      // Если дата уже YYYY-MM-DD, вернет её, иначе попробует преобразовать
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
    };

    // СИНХРОНИЗАЦИЯ: Если файл закрыли или открыли новый, обновляем локальную копию
    useEffect(() => {
      setLocalMeta(meta);
    }, [meta]);

    // 1. Логика обработки изменений
    const processMetaUpdate = useCallback(
      (section: string, field: string, newValue: any, currentMeta: any) => {
        const currentSection = currentMeta[section] || {};

        const isTiptapEmpty =
          newValue?.type === "doc" &&
          (!newValue.content || newValue.content.length === 0);
        const shouldRemove =
          newValue === null || newValue === "" || isTiptapEmpty;

        let updatedSection;
        if (shouldRemove) {
          if (!(field in currentSection)) return null;
          const { [field]: _, ...rest } = currentSection;
          updatedSection = rest;
        } else {
          // Глубокое сравнение для объектов, простое для строк
          if (
            typeof newValue !== "object" &&
            currentSection[field] === newValue
          )
            return null;
          if (
            typeof newValue === "object" &&
            JSON.stringify(currentSection[field]) === JSON.stringify(newValue)
          )
            return null;

          updatedSection = { ...currentSection, [field]: newValue };
        }

        return { ...currentMeta, [section]: updatedSection };
      },
      [],
    );

    // 2. Debounce для родителя
    const debouncedNotify = useMemo(
      () => debounce((nextMeta: any) => onMetaChange(nextMeta), 300),
      [onMetaChange],
    );

    // 3. Основной метод (исправленный setLocalMeta)
    const handleMetaUpdate = useCallback(
      (section: string, field: string, newValue: any) => {
        setLocalMeta((prevMeta: any) => {
          // Используем callback внутри сетера
          const nextFullMeta = processMetaUpdate(
            section,
            field,
            newValue,
            prevMeta,
          );
          if (nextFullMeta) {
            debouncedNotify(nextFullMeta);
            return nextFullMeta;
          }
          return prevMeta;
        });
      },
      [processMetaUpdate, debouncedNotify], // localMeta больше не нужна в зависимостях
    );

    if (!meta) return <div>Загрузка...</div>;

    const generateUUID = () => {
      // Генерируем стандартный UUID v4
      const newId = crypto.randomUUID();
      handleMetaUpdate("DocumentInfo", "Id", newId);
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
                          handleMetaUpdate("TitleInfo", "Title", val)
                        }
                      />
                      {/* Блок обложки */}
                      <CoverPicker
                        value={titleInfo?.coverPage}
                        onUpdate={(base64) =>
                          handleMetaUpdate("TitleInfo", "CoverPage", base64)
                        }
                      />

                      <Field
                        label="Язык книги"
                        value={titleInfo?.lang}
                        icon={Languages}
                        options={LANGUAGES}
                        onChange={(val) =>
                          handleMetaUpdate("TitleInfo", "Lang", val)
                        }
                      />
                      <Field
                        label="Язык оригигинала"
                        value={titleInfo?.srcLang}
                        icon={Languages}
                        options={LANGUAGES}
                        onChange={(val) =>
                          handleMetaUpdate("TitleInfo", "SrcLang", val)
                        }
                      />
                      <Field
                        label="Ключевые слова"
                        value={titleInfo?.keywords}
                        icon={Hash}
                        multiline
                        rows={2}
                        onChange={(val) =>
                          handleMetaUpdate("TitleInfo", "Keywords", val)
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
                          handleMetaUpdate("TitleInfo", "Genres", newGenres)
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
                          handleMetaUpdate("TitleInfo", "Authors", newAuthors)
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
                            "TitleInfo",
                            "Translators",
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
                          handleMetaUpdate("TitleInfo", "Sequence", newSeqs)
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
                        content={titleInfo?.annotation}
                        onChange={(newJson) =>
                          handleMetaUpdate("TitleInfo", "Annotation", newJson)
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
                          handleMetaUpdate("SrcTitleInfo", "Title", val)
                        }
                      />
                      {/* Блок обложки */}
                      <CoverPicker
                        value={srctitleInfo?.coverPage}
                        onUpdate={(base64) =>
                          handleMetaUpdate("TitleInfo", "CoverPage", base64)
                        }
                      />
                      <Field
                        label="Язык книги"
                        value={srctitleInfo?.lang}
                        icon={Languages}
                        options={LANGUAGES}
                        onChange={(val) =>
                          handleMetaUpdate("SrcTitleInfo", "Lang", val)
                        }
                      />
                      <Field
                        label="Язык оригигинала"
                        value={srctitleInfo?.srcLang}
                        icon={Languages}
                        options={LANGUAGES}
                        onChange={(val) =>
                          handleMetaUpdate("SrcTitleInfo", "SrcLang", val)
                        }
                      />
                      <Field
                        label="Ключевые слова"
                        value={titleInfo?.keywords}
                        icon={Hash}
                        multiline
                        rows={2}
                        onChange={(val) =>
                          handleMetaUpdate("SrcTitleInfo", "Keywords", val)
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
                          handleMetaUpdate("TitleInfo", "Genres", newGenres)
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
                            "SrcTitleInfo",
                            "Authors",
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
                            "SrcTitleInfo",
                            "Translators",
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
                          handleMetaUpdate("SrcTitleInfo", "Sequence", newSeqs)
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
                        content={srctitleInfo?.annotation || []}
                        onChange={(newJson) =>
                          handleMetaUpdate(
                            "SrcTitleInfo",
                            "Annotation",
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
                      />
                      <Field
                        label="Издатель"
                        value={publishInfo?.publisher}
                        icon={Printer}
                      />
                      <Field label="Город" value={publishInfo?.city} />
                      <Field
                        label="Год издания"
                        value={publishInfo?.year}
                        icon={Calendar}
                      />
                      <Field
                        label="ISBN"
                        value={publishInfo?.isbn}
                        icon={ShieldCheck}
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
                          handleMetaUpdate("PublishInfo", "Sequence", newSeqs)
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
                          handleMetaUpdate("DocumentInfo", "Id", val)
                        }
                        action={{
                          icon: Dices,
                          onClick: generateUUID,
                          title: "Сгенерировать уникальный ID",
                        }}
                      />
                      <Field label="Версия" value={docInfo?.version} />
                      <Field label="Программа" value={docInfo?.program} />
                      <Field
                        label="Дата создания файла"
                        value={formatDateForInput(meta.documentInfo?.date)}
                        type="date"
                        icon={Calendar}
                        onChange={(val) =>
                          handleMetaUpdate("DocumentInfo", "Date", val)
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
                            "DocumentInfo",
                            "Authors",
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
                      />
                      <Field
                        label="Автор OCR"
                        value={docInfo?.srcOcr}
                        icon={Link}
                      />
                    </Section>

                    <Section
                      title="История изменений"
                      icon={History}
                      className="mt-4"
                      defaultOpen={false}
                    >
                      <RichTextEditor
                        content={docInfo?.history || []}
                        onChange={(newJson) =>
                          handleMetaUpdate("DocumentInfo", "History", newJson)
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
                        items={meta?.customInfo?.customItems || []}
                        onUpdate={(newItems) =>
                          handleMetaUpdate(
                            "CustomInfo",
                            "customItems",
                            newItems,
                          )
                        }
                        defaultOpen={true}
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

const TabButton = ({ active, onClick, label, icon }: any) => (
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
