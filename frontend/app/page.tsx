"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { ContentsSidebar } from "@/components/layout/ContentsSidebar";
import { MetadataSidebar } from "@/components/layout/metadata-sidebar/MetadataSidebar";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { StatusBar } from "@/components/layout/StatusBar";
import { Toolbar } from "@/components/layout/Toolbar";
import { Loader } from "@/components/layout/Loader";
import { NotePopup } from "@/components/editor/NotePopup";
import { useEditorManager } from "@/hooks/useEditorManager";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { ImageBubbleMenu } from "@/components/editor/ImageBubbleMenu";
import { LinkBubbleMenu } from "@/components/editor/LinkBubbleMenu";
import { Fb2SectionMenu } from "@/components/editor/Fb2SectionMenu";
import { Fb2PoemMenu } from "@/components/editor/Fb2PoemMenu";
import { getFileName } from "@/utils/utils";
import { SpellcheckMenu } from "@/components/editor/SpellCheckMenu";

/**
 * Основной компонент страницы редактора FB2.
 * Собирает все части интерфейса: шапку, боковые панели, редактор, статус-бар и всплывающие меню.
 * Управляет состоянием сайдбаров, обрабатывает глобальные сочетания клавиш и отображает загрузчик.
 *
 * @component
 * @example
 * <Page />
 *
 * @remarks
 * - Использует `useEditorManager` для централизованного управления состоянием редактора.
 * - Подключает `useGlobalShortcuts` для обработки горячих клавиш (например, Ctrl+S, Alt+B).
 * - Автоматически возвращает фокус в редактор при закрытии боковых панелей.
 * - Отображает {@link Loader} во время длительных операций (открытие, сохранение).
 * - Показывает {@link NotePopup} при редактировании сносок.
 */
export default function Page() {
  const {
    editor,
    notes,
    isLoading,
    loaderConfig,
    loadingFileName,
    currentFilePath,
    tocTree,
    actions,
    scrollToHeading,
  } = useEditorManager();

  // Извлекаем имя файла из полного пути
  const displayFileName = useMemo(
    () => getFileName(currentFilePath),
    [currentFilePath],
  );

  // Состояние и переключение боковой панели оглавления
  const [isContentsSidebarOpen, setIsContentsSidebarOpen] = useState(false);
  const toggleContentsSidebar = useCallback(
    () => setIsContentsSidebarOpen((v) => !v),
    [],
  );

  // Состояние и переключение боковой панели метаданных
  const [isMetadataSidebarOpen, setIsMetadataSidebarOpen] = useState(false);
  const toggleMetadataSidebar = useCallback(
    () => setIsMetadataSidebarOpen((v) => !v),
    [],
  );

  // Объединяем все доступные действия для обработки горячих клавиш
  const allActions = useMemo(
    () => ({
      ...actions,
      toggleContentsSidebar,
      toggleMetadataSidebar,
    }),
    [actions, toggleContentsSidebar, toggleMetadataSidebar],
  );

  // Подключаем обработку глобальных сочетаний клавиш
  useGlobalShortcuts(allActions);

  // Возвращаем фокус в редактор при закрытии боковой панели оглавления
  useEffect(() => {
    if (!isContentsSidebarOpen && editor) {
      setTimeout(() => editor.commands.focus(), 100);
    }
  }, [isContentsSidebarOpen, editor]);

  // Возвращаем фокус в редактор при закрытии боковой панели метаданных
  useEffect(() => {
    if (!isMetadataSidebarOpen && editor) {
      setTimeout(() => editor.commands.focus(), 100);
    }
  }, [isMetadataSidebarOpen, editor]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Верхняя строка меню */}
      <Header
        editor={editor}
        onSave={actions.save}
        onEpubExport={actions.exportEpub}
        onNew={actions.newFile}
        onOpen={actions.open}
        onExit={actions.exitApp}
        fileName={displayFileName}
      />

      {/* Основной макет с боковыми панелями и редактором */}
      <div className="flex flex-1 overflow-hidden relative">
        <ContentsSidebar
          tree={tocTree}
          editor={editor}
          onSelectHeading={scrollToHeading}
          isOpen={isContentsSidebarOpen}
          onToggle={toggleContentsSidebar}
        />

        {/* Центральная область — редактор */}
        <main className="flex-1 flex flex-col min-w-0">
          <Toolbar
            editor={editor}
            onSelectImage={actions.selectImage}
            onAddFootnote={notes.addFootnote}
            onAddLink={actions.addLink}
          />
          <EditorCanvas editor={editor} />
        </main>

        {/* Боковая панель метаданных книги */}
        {/* Боковая панель метаданных книги — рендерим только если есть editor */}
        {editor && (
          <MetadataSidebar
            editor={editor}
            isOpen={isMetadataSidebarOpen}
            onToggle={toggleMetadataSidebar}
          />
        )}
      </div>

      {/* Всплывающие меню для специфических элементов */}
      <SpellcheckMenu editor={editor} />
      <ImageBubbleMenu editor={editor} />
      <LinkBubbleMenu editor={editor} /> 
      <Fb2SectionMenu editor={editor} onSelectImage={actions.selectImage} />
      <Fb2PoemMenu editor={editor} />

      {/* Индикатор загрузки */}
      {isLoading && (
        <Loader
          fileName={loadingFileName}
          title={loaderConfig?.title}
          subtitle={loaderConfig?.subtitle}
        />
      )}

      {/* Всплывающее окно редактирования сноски */}
      {notes.activeNote && (
        <NotePopup
          note={notes.activeNote}
          content={notes.footnotes[notes.activeNote.id] || ""}
          existingIds={Object.keys(notes.footnotes)}
          onUpdate={notes.updateNoteContent}
          onClose={notes.closeNotePopup}
          onDelete={notes.deleteFootnote}
        />
      )}

      {/* Статус-бар внизу экрана */}
      <StatusBar fileName={displayFileName} loading={isLoading} />
    </div>
  );
}
