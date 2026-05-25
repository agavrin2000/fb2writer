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
import { SpellcheckContextMenu } from "@/components/editor/SpellcheckContextMenu";
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
 // -------------------------------------------------------------
  // 🟢 ИНФРАСТРУКТУРА ОРФОГРАФИИ ДЛЯ ОЦИФРОВЩИКОВ
  // -------------------------------------------------------------
  // Стейт для координат и данных контекстного меню орфографии
  const [spellMenuState, setSpellMenuState] = useState<{
    x: number;
    y: number;
    word: string;
    suggestions: string[];
  } | null>(null);

  // Передаем словари и исключения в ваш кастомный менеджер редактора,
  // чтобы функция getEditorExtensions() внутри хука могла их использовать
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
    spellInstance,
    addException,
  } = useEditorManager(); // Передаем конфигурацию в хук

  // 🔥 Перехватчик правого клика на холсте редактора
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const errorSpan = target.closest(".spellcheck-error") as HTMLElement | null;

    // Если клик не по ошибке орфографии, закрываем кастомное меню 
    // и позволяем браузеру открыть дефолтное меню ОС
    if (!errorSpan || !spellInstance || !editor) {
      setSpellMenuState(null);
      return;
    }

    // Блокируем нативное системное меню WebView2 для ошибочных слов
    e.preventDefault();

    const word = errorSpan.getAttribute("data-word") || errorSpan.innerText;
    const suggestions = spellInstance.suggest(word);

    setSpellMenuState({
      x: e.clientX,
      y: e.clientY,
      word,
      suggestions,
    });
  }, [spellInstance, editor]);

  // Замена слова в ProseMirror-документе по координатам клика
  const handleReplaceWord = useCallback((replacement: string) => {
    if (!spellMenuState || !editor) return;
    const { x, y } = spellMenuState;

    editor.commands.focus();
    const pos = editor.view.posAtCoords({ left: x, top: y });
    
    if (pos) {
      const $pos = editor.state.doc.resolve(pos.inside >= 0 ? pos.inside : pos.pos);
      const text = $pos.parent.textContent;
      const indexInText = $pos.parentOffset;
      const wordRegex = /\p{L}+/gu;
      let match;
      let startPos = -1;
      let endPos = -1;

      while ((match = wordRegex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match.length;
        if (indexInText >= start && indexInText <= end) {
          startPos = $pos.start() + start;
          endPos = $pos.start() + end;
          break;
        }
      }

      if (startPos !== -1 && endPos !== -1) {
        editor.chain().insertContentAt({ from: startPos, to: endPos }, replacement).run();
      }
    }
    setSpellMenuState(null);
  }, [spellMenuState, editor]);


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
          <EditorCanvas editor={editor} onContextMenu={handleContextMenu} />
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
      <ImageBubbleMenu editor={editor} />
      <LinkBubbleMenu editor={editor} /> 
      <Fb2SectionMenu editor={editor} onSelectImage={actions.selectImage} />
      <Fb2PoemMenu editor={editor} />
      {/* 🔥 Рендерим плавающее контекстное меню спеллчекера */}
      {spellMenuState && (
        <SpellcheckContextMenu
          x={spellMenuState.x}
          y={spellMenuState.y}
          word={spellMenuState.word}
          suggestions={spellMenuState.suggestions}
          onReplace={handleReplaceWord}
          onAddException={addException}
          onClose={() => setSpellMenuState(null)}
        />
      )}




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
