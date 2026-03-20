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
        openFile, saveFile, activeNote, setMetadata,
        loadingFileName, footnotes, closeNotePopup, updateNoteText, addFootnote, deleteFootnote
    } = useFB2Editor();

    /* исходный варинат
       const scrollToHeading = (pos: number) => {
            if (!editor || !scrollRef.current) return;
    
            // Сначала перемещаем каретку
            editor.commands.focus(pos);
            editor.commands.setTextSelection(pos);
    
            // Ждем один тик отрисовки, чтобы координаты стали актуальными
            requestAnimationFrame(() => {
                try {
                    // Получаем координаты конкретной позиции
                    const coords = editor.view.coordsAtPos(pos);
                    const container = scrollRef.current;
    
                    if (coords && container) {
                        const containerRect = container.getBoundingClientRect();
    
                        // Вычисляем позицию: 
                        // Текущий скролл контейнера + (Y координаты текста - Y верхний край контейнера)
                        const targetTop = container.scrollTop + (coords.top - containerRect.top);
    
                        container.scrollTo({
                            top: targetTop - 40, // 40px отступ сверху для красоты
                            behavior: 'smooth'
                        });
                    }
                } catch (e) {
                    // Если позиция не валидна (например, дерево еще не обновилось)
                    console.warn("Could not scroll to pos:", pos);
                }
            });
        };
    */
/*
    const scrollToHeading = (pos: number) => {
        if (!editor || !scrollRef.current) return;

        // 1. Принудительный фокус и выделение (будит секцию)
        editor.commands.setTextSelection(pos);

        const container = scrollRef.current;
        let attempts = 0;
        const maxAttempts = 25; // Сколько раз будем проверять, не уплыли ли координаты

        const performScroll = () => {
            const coords = editor.view.coordsAtPos(pos);
            const containerRect = container.getBoundingClientRect();

            if (coords) {
                const targetTop = container.scrollTop + (coords.top - containerRect.top) - 80;

                container.scrollTo({
                    top: targetTop,
                    behavior: attempts === 0 ? 'smooth' : 'auto' // Первый раз плавно, потом мгновенно корректируем
                    //behavior: 'auto' // Первый раз плавно, потом мгновенно корректируем
                });

                // Если мы еще не сделали все попытки, проверяем через 100мс
                if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(performScroll, 200); // Даем время на развертывание content-visibility
                }
            }
        };

        // Запускаем первый цикл
        requestAnimationFrame(performScroll);
    };
*/

/*const scrollToHeading = (sectionId: string, pos: number) => {
    if (!editor || !sectionId) return;

    // 1. Пробуждаем секцию (фокус принудительно рендерит узел)
    editor.chain().focus().setTextSelection(pos).run();

    const element = document.getElementById(sectionId);
    if (!element) return;

    let attempts = 0;
    const maxAttempts = 15; // 1.5 секунды слежения (хватит для 5 МБ)

    const stabilize = () => {
        const currentElement = document.getElementById(sectionId);
        if (currentElement) {
            // Используем нативный метод. 
            // Первый раз - плавно (smooth), остальные - мгновенно (auto) для фиксации.
            currentElement.scrollIntoView({
                behavior: attempts === 0 ? 'smooth' : 'auto',
                block: 'start'
            });

            if (attempts < maxAttempts) {
                attempts++;
                // Каждые 100мс проверяем, не уплыл ли заголовок
                setTimeout(stabilize, 100); 
            }
        }
    };

    // Запускаем цикл стабилизации
    requestAnimationFrame(stabilize);
};*/


const scrollToHeading = (sectionId: string, pos: number) => {
    if (!editor || !sectionId) return;

    editor.chain().focus().setTextSelection(pos).run();

    let attempts = 0;
    const maxAttempts = 15;

    const stabilize = () => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({
                behavior: attempts === 0 ? 'smooth' : 'auto',
                block: 'start'
            });

            if (attempts < maxAttempts) {
                attempts++;
                setTimeout(stabilize, 100);
            }
        }
    };

    requestAnimationFrame(stabilize);
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
                        onAddFootnote={addFootnote}
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
                    onMetaChange={setMetadata}
                />
            </div>
            {/* Всплывающее меню для картинок */}
            <ImageBubbleMenu editor={editor} />
            {/* Всплывающее меню для секций */}
            <SectionBubbleMenu editor={editor} />

            {/* Индикатор загрузки XML */}
            {isLoading && <Loader fileName={loadingFileName} />}

            {/* Редактор сносок */}
            {activeNote && (
                <NotePopup
                    note={activeNote}
                    content={footnotes[activeNote.id] || ''}
                    existingIds={Object.keys(footnotes)}
                    onUpdate={updateNoteText}
                    onClose={closeNotePopup}
                    onDelete={deleteFootnote}
                />
            )}
            <StatusBar fileName="book.fb2" loading={isLoading} />
        </div>
    );
}
