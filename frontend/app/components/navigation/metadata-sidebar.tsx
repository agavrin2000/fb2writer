'use client';
import React, { useState, ReactNode, ElementType } from 'react';
import {
    ChevronRight, ChevronLeft, ChevronDown, BookOpen, Printer, FileText,
    User, Tag, Calendar, Hash, History, Link, ShieldCheck, Info, TextQuote, Languages
} from 'lucide-react';
import { EditableList } from '../ui/editable-list'
import { Field } from '../ui/field'
import { PersonList } from '../ui/person-list'
import { Section } from '../ui/section'
import { SequenceList } from '../ui/sequence-list'
import { GenreList } from '../ui/genre-list'
import { CustomInfoList } from '../ui/custom-info-list'
import { RichTextEditor } from '../ui/richtext-editor'
import { CoverPicker } from '../ui/cover-picker'

interface MetadataSidebarProps {
    meta: any;
    onMetaChange: (newMeta: any) => void;
}


const FB2_GENRES_ARRAY = ['accounting', 'adv_animal', 'adv_geo', 'adv_history', 'adv_maritime', 'adv_western', 'adventure', 'antique', 'antique_ant', 'antique_east', 'antique_european', 'antique_myths', 'antique_russian', 'aphorism_quote', 'architecture_book', 'auto_regulations', 'banking', 'beginning_authors', 'child_adv', 'child_det', 'child_education', 'child_prose', 'child_sf', 'child_tale', 'child_verse', 'children', 'cinema_theatre', 'city_fantasy', 'comp_db', 'comp_hard', 'comp_osnet', 'comp_programming', 'comp_soft', 'comp_www', 'computers', 'design', 'det_action', 'det_classic', 'det_crime', 'det_espionage', 'det_hard', 'det_history', 'det_irony', 'det_police', 'det_political', 'detective', 'dragon_fantasy', 'dramaturgy', 'economics', 'essays', 'fantasy_fight', 'foreign_action', 'foreign_adventure', 'foreign_antique', 'foreign_business', 'foreign_children', 'foreign_comp', 'foreign_contemporary', 'foreign_contemporary_lit', 'foreign_desc', 'foreign_detective', 'foreign_dramaturgy', 'foreign_edu', 'foreign_fantasy', 'foreign_home', 'foreign_humor', 'foreign_language', 'foreign_love', 'foreign_novel', 'foreign_other', 'foreign_poetry', 'foreign_prose', 'foreign_psychology', 'foreign_publicism', 'foreign_religion', 'foreign_sf', 'geo_guides', 'geography_book', 'global_economy', 'historical_fantasy', 'home', 'home_cooking', 'home_crafts', 'home_diy', 'home_entertain', 'home_garden', 'home_health', 'home_pets', 'home_sex', 'home_sport', 'humor', 'humor_anecdote', 'humor_fantasy', 'humor_prose', 'humor_verse', 'industries', 'job_hunting', 'literature_18', 'literature_19', 'literature_20', 'love_contemporary', 'love_detective', 'love_erotica', 'love_fantasy', 'love_history', 'love_sf', 'love_short', 'magician_book', 'management', 'marketing', 'military_special', 'music_dancing', 'narrative', 'newspapers', 'nonf_biography', 'nonf_criticism', 'nonf_publicism', 'nonfiction', 'org_behavior', 'paper_work', 'pedagogy_book', 'periodic', 'personal_finance', 'poetry', 'popadanec', 'popular_business', 'prose_classic', 'prose_counter', 'prose_history', 'prose_military', 'prose_rus_classic', 'prose_su_classics', 'psy_alassic', 'psy_childs', 'psy_generic', 'psy_personal', 'psy_sex_and_family', 'psy_social', 'psy_theraphy', 'real_estate', 'ref_dict', 'ref_encyc', 'ref_guide', 'ref_ref', 'reference', 'religion', 'religion_esoterics', 'religion_rel', 'religion_self', 'russian_contemporary', 'russian_fantasy', 'sci_biology', 'sci_chem', 'sci_culture', 'sci_history', 'sci_juris', 'sci_linguistic', 'sci_math', 'sci_medicine', 'sci_philosophy', 'sci_phys', 'sci_politics', 'sci_religion', 'sci_tech', 'science', 'sf', 'sf_action', 'sf_cyberpunk', 'sf_detective', 'sf_fantasy', 'sf_heroic', 'sf_history', 'sf_horror', 'sf_humor', 'sf_social', 'sf_space', 'short_story', 'sketch', 'small_business', 'sociology_book', 'stock', 'thriller', 'upbringing_book', 'vampire_book', 'visual_arts', 'unrecognised']
const LANGUAGES = [
    { value: 'ru', label: 'Русский' },
    { value: 'en', label: 'English' },
    { value: 'de', label: 'Deutsch' },
    { value: 'fr', label: 'Français' },
    { value: 'uk', label: 'Українська' },
    { value: 'be', label: 'Беларуская' },
];

export const MetadataSidebar = ({ meta, onMetaChange }: MetadataSidebarProps) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'title' | 'src-title' | 'publish' | 'custom' | 'doc'>('title');

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    // Безопасный доступ к веткам JSON
    const titleInfo = meta?.TitleInfo || {};
    const srctitleInfo = meta?.SrcTitleInfo || {};
    const publishInfo = meta?.PublishInfo || {};
    const docInfo = meta?.DocumentInfo || {};
    const customInfo = meta?.CustomInfo || {};

    const formatDateForInput = (dateStr: string) => {
        if (!dateStr) return "";
        // Если дата уже YYYY-MM-DD, вернет её, иначе попробует преобразовать
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? "" : date.toISOString().split('T')[0];
    };

    const handleMetaUpdate = (section: 'TitleInfo' | 'DocumentInfo' | 'SrcTitleInfo' | 'PublishInfo' | 'CustomInfo', field: string, newValue: any) => {
        onMetaChange({
            ...meta,
            [section]: {
                ...meta[section],
                [field]: newValue
            }
        });
    };

    if (!meta) return <div>Загрузка...</div>;
    return (
        <div className="relative flex h-full select-none shrink-0">
            {/* Кнопка открытия (Плавающая справа, когда закрыто) */}
            {!isSidebarOpen && (
                <button type="button"
                    onClick={toggleSidebar}
                    className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-white border border-gray-200 border-r-0 p-2 rounded-l-xl shadow-lg hover:bg-blue-50 text-blue-600 transition-all animate-in slide-in-from-right duration-200"
                    title="Открыть метаданные"
                >
                    <ChevronLeft size={20} strokeWidth={3} />
                </button>
            )}

            {/* Основной контейнер сайдбара */}
            <aside className={`
                relative flex flex-col border-l bg-gray-50 shadow-xl z-40 transition-all duration-300
                ${isSidebarOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'}
            `}>
                {/* Шапка и Вкладки */}
                <div className="flex flex-col bg-white border-b min-w-[320px]">
                    <div className="p-4 flex justify-between items-center">
                        <button type="button" title="Скрыть метаданные"
                            onClick={toggleSidebar}
                            className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors"
                        >
                            <ChevronRight size={18} />
                        </button>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Описание FB2</span>
                        <Info size={16} className="text-gray-300" />
                    </div>

                    <div className="flex px-2 border-t">
                        <TabButton
                            active={activeTab === 'title'}
                            onClick={() => setActiveTab('title')}
                            label="Title"
                            icon={<BookOpen size={12} />}
                        />
                        <TabButton
                            active={activeTab === 'src-title'}
                            onClick={() => setActiveTab('src-title')}
                            label="Src-Title"
                            icon={<BookOpen size={12} />}
                        />
                        <TabButton
                            active={activeTab === 'publish'}
                            onClick={() => setActiveTab('publish')}
                            label="Publish"
                            icon={<Printer size={12} />}
                        />
                        <TabButton
                            active={activeTab === 'doc'}
                            onClick={() => setActiveTab('doc')}
                            label="Doc"
                            icon={<FileText size={12} />}
                        />
                        <TabButton
                            active={activeTab === 'custom'}
                            onClick={() => setActiveTab('custom')}
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
                            {activeTab === 'title' && (
                                <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                                    <Section title="Произведение" icon={BookOpen} defaultOpen={true}>
                                        <Field label="Название книги" value={titleInfo.Title} icon={BookOpen}
                                            onChange={(val) => handleMetaUpdate('TitleInfo', 'Title', val)}
                                        />
                                        {/* Блок обложки */}
                                        <CoverPicker
                                            value={titleInfo.CoverPage}
                                            onUpdate={(base64) => handleMetaUpdate('TitleInfo', 'CoverPage', base64)}
                                        />

                                        <Field
                                            label="Язык книги"
                                            value={titleInfo.Lang}
                                            icon={Languages}
                                            options={LANGUAGES}
                                            onChange={(val) => handleMetaUpdate('TitleInfo', 'Lang', val)}
                                        />
                                        <Field
                                            label="Язык оригигинала"
                                            value={titleInfo.SrcLang}
                                            icon={Languages}
                                            options={LANGUAGES}
                                            onChange={(val) => handleMetaUpdate('TitleInfo', 'SrcLang', val)}
                                        />
                                        <Field label="Ключевые слова" value={titleInfo.Keywords} icon={Hash}
                                            multiline rows={2}
                                            onChange={(val) => handleMetaUpdate('TitleInfo', 'Keywords', val)} />
                                    </Section>

                                    <Section title={`Жанры (${titleInfo.Genres?.length ?? 0})`} icon={Tag} className="mt-4" defaultOpen={false}>
                                        <GenreList
                                            genres={titleInfo.Genres}
                                            onUpdate={(newGenres) => handleMetaUpdate('TitleInfo', 'Genres', newGenres)}
                                            availableGenres={FB2_GENRES_ARRAY}
                                        />
                                    </Section>

                                    <Section title="Авторы" icon={User} className="mt-4" defaultOpen={false}>
                                        <PersonList
                                            title="Автор"
                                            items={titleInfo.Authors}
                                            onUpdate={(newAuthors) => handleMetaUpdate('TitleInfo', 'Authors', newAuthors)}
                                        />
                                    </Section>

                                    <Section title="Переводчики" icon={User} className="mt-4" defaultOpen={false}>
                                        <PersonList
                                            title="Автор"
                                            items={titleInfo.Translators}
                                            onUpdate={(newTranslators) => handleMetaUpdate('TitleInfo', 'Translators', newTranslators)}
                                        />
                                    </Section>

                                    <Section title="Серия" icon={Hash} className="mt-4" defaultOpen={false}>
                                        <SequenceList
                                            items={titleInfo.Sequence || []}
                                            onUpdate={(newSeqs) => handleMetaUpdate('TitleInfo', 'Sequence', newSeqs)}
                                        />
                                    </Section>

                                    <Section title="Аннотация" icon={TextQuote} className="mt-4" defaultOpen={false}>
                                        <RichTextEditor
                                            content={titleInfo.Annotation || []}
                                            onChange={(newJson) => handleMetaUpdate('TitleInfo', 'Annotation', newJson)}
                                        />
                                    </Section>
                                </div>
                            )}
                            {/* Вкладка 1: SrcTitle-Info */}
                            {activeTab === 'src-title' && (
                                <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                                    <Section title="Произведение (язык оригинала)" icon={BookOpen} defaultOpen={true}>
                                        <Field label="Название книги" value={srctitleInfo.Title} icon={BookOpen}
                                            onChange={(val) => handleMetaUpdate('SrcTitleInfo', 'Title', val)}
                                        />
                                        {/* Блок обложки */}
                                        <CoverPicker
                                            value={srctitleInfo.CoverPage}
                                            onUpdate={(base64) => handleMetaUpdate('TitleInfo', 'CoverPage', base64)}
                                        />
                                        <Field
                                            label="Язык книги"
                                            value={srctitleInfo.Lang}
                                            icon={Languages}
                                            options={LANGUAGES}
                                            onChange={(val) => handleMetaUpdate('SrcTitleInfo', 'Lang', val)}
                                        />
                                        <Field
                                            label="Язык оригигинала"
                                            value={srctitleInfo.SrcLang}
                                            icon={Languages}
                                            options={LANGUAGES}
                                            onChange={(val) => handleMetaUpdate('SrcTitleInfo', 'SrcLang', val)}
                                        />
                                        <Field label="Ключевые слова" value={titleInfo.Keywords} icon={Hash}
                                            multiline rows={2}
                                            onChange={(val) => handleMetaUpdate('SrcTitleInfo', 'Keywords', val)} />
                                    </Section>

                                    <Section title={`Жанры (${srctitleInfo.Genres?.length ?? 0})`} icon={Tag} defaultOpen={true}>
                                        <GenreList
                                            genres={srctitleInfo.Genres ?? []}
                                            onUpdate={(newGenres) => handleMetaUpdate('TitleInfo', 'Genres', newGenres)}
                                            availableGenres={FB2_GENRES_ARRAY}
                                        />
                                    </Section>

                                    <Section title="Авторы" icon={User} className="mt-4" defaultOpen={false}>
                                        <PersonList
                                            title="Автор"
                                            items={srctitleInfo.Authors}
                                            onUpdate={(newAuthors) => handleMetaUpdate('SrcTitleInfo', 'Authors', newAuthors)}
                                        />
                                    </Section>

                                    <Section title="Переводчики" icon={User} className="mt-4" defaultOpen={false}>
                                        <PersonList
                                            title="Автор"
                                            items={srctitleInfo.Translators}
                                            onUpdate={(newTranslators) => handleMetaUpdate('SrcTitleInfo', 'Translators', newTranslators)}
                                        />
                                    </Section>

                                    <Section title="Серия" icon={Hash} className="mt-4" defaultOpen={false}>
                                        <SequenceList
                                            items={srctitleInfo.Sequence || []}
                                            onUpdate={(newSeqs) => handleMetaUpdate('SrcTitleInfo', 'Sequence', newSeqs)}
                                        />
                                    </Section>
                                    <Section title="Аннотация" icon={TextQuote} className="mt-4" defaultOpen={false}>
                                        <RichTextEditor
                                            content={srctitleInfo.Annotation || []}
                                            onChange={(newJson) => handleMetaUpdate('SrcTitleInfo', 'Annotation', newJson)}
                                        />
                                    </Section>

                                </div>
                            )}

                            {/* Вкладка 2: Publish-Info */}
                            {activeTab === 'publish' && (
                                <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                                    <Section title="Издательство" icon={Printer} defaultOpen={true}>
                                        <Field label="Название книги" value={publishInfo.BookName} />
                                        <Field label="Издатель" value={publishInfo.Publisher} icon={Printer} />
                                        <Field label="Город" value={publishInfo.City} />
                                        <Field label="Год издания" value={publishInfo.Year} icon={Calendar} />
                                        <Field label="ISBN" value={publishInfo.ISBN} icon={ShieldCheck} />
                                    </Section>

                                    <Section title="Серия" icon={Hash} className="mt-4" defaultOpen={false}>
                                        <SequenceList
                                            items={publishInfo.Sequence || []}
                                            onUpdate={(newSeqs) => handleMetaUpdate('PublishInfo', 'Sequence', newSeqs)}
                                        />
                                    </Section>
                                </div>
                            )}

                            {/* Вкладка 3: Document-Info */}
                            {activeTab === 'doc' && (
                                <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                                    <Section title="Информация о файле" icon={FileText} defaultOpen={true}>
                                        <Field label="ID Документа" value={docInfo.Id} />
                                        <Field label="Версия" value={docInfo.Version} />
                                        <Field label="Программа" value={docInfo.Program} />
                                        <Field
                                            label="Дата создания файла"
                                            value={formatDateForInput(meta.DocumentInfo?.Date)}
                                            type="date"
                                            icon={Calendar}
                                            onChange={(val) => handleMetaUpdate('DocumentInfo', 'Date', val)}
                                        />
                                    </Section>

                                    <Section title="Авторы документа" icon={User} className="mt-4" defaultOpen={false}>
                                        <PersonList
                                            title="Автор"
                                            items={docInfo.Authors}
                                            onUpdate={(newAuthors) => handleMetaUpdate('DocumentInfo', 'Authors', newAuthors)}
                                        />
                                    </Section>

                                    <Section title="OCR / Источник" icon={Link} className="mt-4" defaultOpen={false}>
                                        <Field label="Source URL" value={docInfo.SrcUrl} icon={Link} />
                                        <Field label="Автор OCR" value={docInfo.SrcOcr} icon={Link} />
                                    </Section>

                                    <Section title="История изменений" icon={History} className="mt-4" defaultOpen={false}>
                                        <RichTextEditor
                                            content={docInfo?.History || []}
                                            onChange={(newJson) => handleMetaUpdate('DocumentInfo', 'History', newJson)}
                                        />
                                    </Section>
                                </div>
                            )}

                            {/* Вкладка 3: Custom-Info */}
                            {activeTab === 'custom' && (
                                <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                                    <Section title="Прочая информация" icon={FileText} defaultOpen={true}>
                                        <CustomInfoList
                                            items={meta?.CustomInfo?.customItems || []}
                                            onUpdate={(newItems) => handleMetaUpdate('CustomInfo', 'customItems', newItems)}
                                            defaultOpen={true}
                                        />
                                    </Section>

                                    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-[10px] text-blue-600 italic">
                                        Здесь хранятся нестандартные теги, такие как ISBN, идентификаторы магазинов или технические пометки.
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
};

// --- Вспомогательные компоненты ---



const TabButton = ({ active, onClick, label, icon }: any) => (
    <button type="button"
        onClick={onClick}
        className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all border-b-2 ${active
            ? 'border-blue-600 text-blue-600 bg-blue-50/50'
            : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
    >
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
);
