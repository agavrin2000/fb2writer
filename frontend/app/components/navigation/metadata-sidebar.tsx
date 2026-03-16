'use client';
import React, { useState } from 'react';
import { 
    ChevronRight, ChevronLeft, BookOpen, Printer, FileText, 
    User, Tag, Calendar, Hash, Globe, Link, ShieldCheck, Info
} from 'lucide-react';

interface MetadataSidebarProps {
    meta: any;
}

export const MetadataSidebar = ({ meta }: MetadataSidebarProps) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<'title' | 'src-title' | 'publish' | 'custom' | 'doc'>('title');

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    // Безопасный доступ к веткам JSON
    const titleInfo = meta?.TitleInfo || {};
    const srctitleInfo = meta?.SrcTitleInfo || {};
    const publishInfo = meta?.PublishInfo || {};
    const docInfo = meta?.DocumentInfo || {};
    const customInfo = meta?.CustomInfo || [];

    return (
        <div className="relative flex h-full select-none shrink-0">
            {/* Кнопка открытия (Плавающая справа, когда закрыто) */}
            {!isSidebarOpen && (
                <button 
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
                        <button 
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
                            label="Title-Info" 
                            icon={<BookOpen size={12}/>}
                        />
                        <TabButton 
                            active={activeTab === 'src-title'} 
                            onClick={() => setActiveTab('src-title')} 
                            label="Src-Title-Info" 
                            icon={<BookOpen size={12}/>}
                        />
                        <TabButton 
                            active={activeTab === 'publish'} 
                            onClick={() => setActiveTab('publish')} 
                            label="Publish" 
                            icon={<Printer size={12}/>}
                        />
                        <TabButton 
                            active={activeTab === 'doc'} 
                            onClick={() => setActiveTab('doc')} 
                            label="Doc" 
                            icon={<FileText size={12}/>}
                        />
                        <TabButton 
                            active={activeTab === 'custom'} 
                            onClick={() => setActiveTab('custom')} 
                            label="Custom-Info" 
                            icon={<FileText size={12}/>}
                        />
                    </div>
                </div>
                
                {/* Контентная область */}
                <div className="flex-grow overflow-y-auto p-4 custom-scrollbar min-w-[320px]">
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
                                    <Section title="Произведение" icon={BookOpen}>
                                        <Field label="Название книги" value={titleInfo.Title} icon={BookOpen} />
                                        <Field label="Жанры" value={titleInfo.Genres?.join(', ')} icon={Tag} />
                                        <Field label="Язык" value={titleInfo.Lang} icon={Globe} />
                                        <Field label="Язык оригигинала" value={titleInfo.SrcLang} icon={Globe} />
                                        <Field label="Ключевые слова" value={titleInfo.Keywords} icon={Hash} />
                                    </Section>

                                    <Section title="Авторы" icon={User} className="mt-4">
                                        {titleInfo.Authors?.map((author: any, idx: number) => (
                                            <div key={idx} className="mb-2 p-2 bg-gray-50 border border-gray-100 rounded text-[11px] text-gray-600">
                                                {`${author.FirstName || ''} ${author.MiddleName || ''} ${author.LastName || ''}`.trim() || author.Nickname}
                                            </div>
                                        ))}
                                    </Section>

                                    <Section title="Переводчики" icon={User} className="mt-4">
                                        {titleInfo.Translators?.map((translator: any, idx: number) => (
                                            <div key={idx} className="mb-2 p-2 bg-gray-50 border border-gray-100 rounded text-[11px] text-gray-600">
                                                {`${translator.FirstName || ''} ${translator.MiddleName || ''} ${translator.LastName || ''}`.trim() || translator.Nickname}
                                            </div>
                                        ))}
                                    </Section>

                                    {titleInfo.Sequence && (
                                        <Section title="Серия" icon={Hash} className="mt-4">
                                            <Field label="Название серии" value={titleInfo.Sequence[0]?.name} />
                                            <Field label="Номер в серии" value={titleInfo.Sequence[0]?.number} />
                                        </Section>
                                    )}
                                </div>
                            )}

                            {/* Вкладка 1: SrcTitle-Info */}
                            {activeTab === 'src-title' && (
                                <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                                    <Section title="Произведение на языке оригинала" icon={BookOpen}>
                                        <Field label="Название книги" value={srctitleInfo.Title} icon={BookOpen} />
                                        <Field label="Жанры" value={srctitleInfo.Genres?.join(', ')} icon={Tag} />
                                        <Field label="Язык" value={srctitleInfo.Lang} icon={Globe} />
                                        <Field label="Язык оригигинала" value={srctitleInfo.SrcLang} icon={Globe} />
                                        <Field label="Ключевые слова" value={srctitleInfo.Keywords} icon={Hash} />
                                    </Section>

                                    <Section title="Авторы" icon={User} className="mt-4">
                                        {srctitleInfo.Authors?.map((author: any, idx: number) => (
                                            <div key={idx} className="mb-2 p-2 bg-gray-50 border border-gray-100 rounded text-[11px] text-gray-600">
                                                {`${author.FirstName || ''} ${author.MiddleName || ''} ${author.LastName || ''}`.trim() || author.Nickname}
                                            </div>
                                        ))}
                                    </Section>

                                    <Section title="Переводчики" icon={User} className="mt-4">
                                        {srctitleInfo.Translators?.map((translator: any, idx: number) => (
                                            <div key={idx} className="mb-2 p-2 bg-gray-50 border border-gray-100 rounded text-[11px] text-gray-600">
                                                {`${translator.FirstName || ''} ${translator.MiddleName || ''} ${translator.LastName || ''}`.trim() || translator.Nickname}
                                            </div>
                                        ))}
                                    </Section>

                                    {srctitleInfo.Sequence && (
                                        <Section title="Серия" icon={Hash} className="mt-4">
                                            <Field label="Название серии" value={srctitleInfo.Sequence[0]?.name} />
                                            <Field label="Номер в серии" value={srctitleInfo.Sequence[0]?.number} />
                                        </Section>
                                    )}
                                </div>
                            )}

                            {/* Вкладка 2: Publish-Info */}
                            {activeTab === 'publish' && (
                                <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                                    <Section title="Издательство" icon={Printer}>
                                        <Field label="Название книги" value={publishInfo.BookName} />
                                        <Field label="Издатель" value={publishInfo.Publisher} icon={Printer} />
                                        <Field label="Город" value={publishInfo.City} />
                                        <Field label="Год издания" value={publishInfo.Year} icon={Calendar} />
                                        <Field label="ISBN" value={publishInfo.ISBN} icon={ShieldCheck} />
                                    </Section>
                                    {publishInfo.Sequence && (
                                        <Section title="Серия" icon={Hash} className="mt-4">
                                            <Field label="Название серии" value={publishInfo.Sequence[0]?.name} />
                                            <Field label="Номер в серии" value={publishInfo.Sequence[0]?.number} />
                                        </Section>
                                    )}
                                </div>
                            )}

                            {/* Вкладка 3: Document-Info */}
                            {activeTab === 'doc' && (
                                <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                                    <Section title="Информация о файле" icon={FileText}>
                                        <Field label="ID Документа" value={docInfo.Id} />
                                        <Field label="Версия" value={docInfo.Version} />
                                        <Field label="Программа" value={docInfo.Program} />
                                        <Field label="Дата создания" value={docInfo.Date} icon={Calendar} />
                                    </Section>
                                    <Section title="Авторы документа" icon={User} className="mt-4">
                                        {docInfo.Authors?.map((author: any, idx: number) => (
                                            <div key={idx} className="mb-2 p-2 bg-gray-50 border border-gray-100 rounded text-[11px] text-gray-600">
                                                {`${author.FirstName || ''} ${author.MiddleName || ''} ${author.LastName || ''}`.trim() || author.Nickname}
                                            </div>
                                        ))}
                                    </Section>
                                    <Section title="OCR / Источник" icon={Link} className="mt-4">
                                        <Field label="Source URL" value={docInfo.SrcUrl} icon={Link} />
                                        <Field label="Автор OCR" value={docInfo.SrcOcr} icon={Link} />
                                    </Section>
                                </div>
                            )}

                            {/* Вкладка 3: Custom-Info */}
                            {activeTab === 'custom' && (
                                <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                                    <Section title="Прочая информация о файле" icon={FileText}>
                                    </Section>
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

const Section = ({ title, icon: Icon, children, className = "" }: any) => (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden ${className}`}>
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
            <Icon size={14} className="text-blue-500" />
            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-tight">{title}</span>
        </div>
        <div className="p-3">
            {children}
        </div>
    </div>
);

const Field = ({ label, value, icon: Icon }: any) => (
    <div className="mb-3 last:mb-0">
        <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1 ml-0.5">{label}</label>
        <div className="relative group">
            {Icon && <Icon size={12} className="absolute left-2.5 top-2.5 text-gray-300 group-focus-within:text-blue-500 transition-colors" />}
            <input 
                type="text"
                defaultValue={value || ''}
                className={`w-full text-[12px] py-1.5 ${Icon ? 'pl-8' : 'px-2'} pr-2 bg-gray-50 border border-gray-100 rounded focus:bg-white focus:ring-1 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-gray-700`}
            />
        </div>
    </div>
);

const TabButton = ({ active, onClick, label, icon }: any) => (
    <button
        onClick={onClick}
        className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all border-b-2 ${
            active 
            ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
            : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
        }`}
    >
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
);
