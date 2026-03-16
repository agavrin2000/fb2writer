'use client';
import { useRef } from 'react';
import { useFB2Editor } from './editor/hooks/useFB2Editor';
import { Header } from './components/layout/header';
import { Sidebar } from './components/navigation/sidebar';
import { MetadataSidebar } from './components/navigation/metadata-sidebar';
import { EditorCanvas } from './components/editor/canvas';
import { StatusBar } from './components/layout/statusbar';
import { Toolbar } from './components/editor/toolbar';
import { ImageBubbleMenu } from './components/editor/image-bubble-menu';
import { SectionBubbleMenu } from './components/editor/section-bubble-menu';
import { Loader } from './components/editor/loader';
import { NotePopup } from './components/editor/note-popup';
import { photino } from './api/photino';

export default function Page() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const {
        editor, tocTree, activeHeadingPos, isLoading, meta,
        openFile, saveFile, activeNote,
        loadingFileName, footnotes, closeNotePopup, updateNoteText 
    } = useFB2Editor();

    const scrollToHeading = (pos: number) => {
        if (!editor || !scrollRef.current) return;
        editor.commands.focus(pos);
        const dom = editor.view.nodeDOM(pos) as HTMLElement;
        if (dom) {
            scrollRef.current.scrollTo({ top: dom.offsetTop - 20, behavior: 'smooth' });
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-white">
            {/* Верхнее меню (Файл, Сохранить) */}
            <Header
                editor={editor}
                onSave={saveFile}
                onOpen={openFile}
            />
            <div className="flex flex-1 overflow-hidden relative">
                {/* Навигация по главам */}
                <Sidebar tree={tocTree} onNavigate={scrollToHeading} activePos={activeHeadingPos} />
                {/* Основная рабочая область */}
                <main className="flex-1 flex flex-col min-w-0 bg-gray-100">
                    {/* Тулбар форматирования над листом */}
                    <Toolbar
                        editor={editor}
                        onSelectImage={() => photino.send('select-image')}
                    />

                    {/* Лист редактора */}
                    <EditorCanvas
                        editor={editor}
                        ref={scrollRef}
                    />
                </main>
                                {/* Правая панель: Метаданные */}
                <MetadataSidebar 
                    meta={meta} 
                    // Здесь в будущем пробросите данные о книге
                />
            </div>
            {/* Всплывающее меню для картинок */}
            <ImageBubbleMenu editor={editor} />

            {/* Индикатор загрузки XML */}
            {isLoading && <Loader fileName={loadingFileName} />}

            {/* Редактор сносок */}
            {activeNote && (
                <NotePopup 
                    note={activeNote} 
                    content={footnotes[activeNote.id] || ''}
                    onUpdate={updateNoteText} 
                    onClose={closeNotePopup} 
                />
            )}
            <StatusBar fileName="book.fb2" loading={isLoading} />
        </div>
    );
}
