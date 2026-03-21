"use client";
import { useFB2Editor } from "./editor/hooks/useFB2Editor";
import { Header } from "./components/layout/header";
import { Sidebar } from "./components/navigation/sidebar";
import { MetadataSidebar } from "./components/navigation/metadata-sidebar";
import { EditorCanvas } from "./components/editor/canvas";
import { StatusBar } from "./components/layout/statusbar";
import { Toolbar } from "./components/editor/toolbar";
import { ImageBubbleMenu } from "./components/editor/image-bubble-menu";
import { SectionBubbleMenu } from "./components/editor/section-bubble-menu";
import { Loader } from "./components/editor/loader";
import { NotePopup } from "./components/editor/note-popup";
import { photino } from "./api/photino";
import { useFootnotes } from "./editor/hooks/useFootnotes";
import { useState, useCallback, useEffect, useRef } from "react";
import { Fb2Metadata } from "./types/types";

export default function Page() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const footnotesRef = useRef<Record<string, any>>({});
  const setActiveNoteRef = useRef<(note: any) => void>(() => {});
  const [metadata, setMetadata] = useState<Fb2Metadata | null>(null);
  const {
    editor,
    setIsLoading,
    setLoadingFileName,
    openFile,
    tocTree,
    activeHeadingPos,
    isLoading,
    loadingFileName,
  } = useFB2Editor(footnotesRef, setActiveNoteRef);

  // 3. Инициализируем хук сносок (передаем editor)
  const {
    activeNote,
    footnotes,
    setFootnotes,
    addFootnote,
    updateNoteContent,
    closeNotePopup,
    deleteFootnote,
    cleanupOrphanNotes,
  } = useFootnotes(editor, footnotesRef, setActiveNoteRef);

  // 4. ФИНАЛЬНАЯ ФУНКЦИЯ ЗАГРУЗКИ (внутри Page)
  const onFb2Content = useCallback(
    (payload: any) => {
      const fb2data =
        typeof payload === "string" ? JSON.parse(payload) : payload;

      if (editor && fb2data) {
        setMetadata(fb2data.Meta || {});
        if (fb2data.Footnotes) {
          setFootnotes(fb2data.Footnotes);
          // И обновляем реф вручную для handleClick
          if (footnotesRef.current) footnotesRef.current = fb2data.Footnotes;
        } else {
          setFootnotes({});
        }
        if (fb2data.EditorContent) {
          editor.commands.setContent(fb2data.EditorContent);
        }
        setIsLoading(false);
        setLoadingFileName("");
      }
    },
    [editor, setFootnotes, setMetadata, setIsLoading, setLoadingFileName],
  );

  const saveFile = useCallback(() => {
    if (!editor || isLoading) return;
    if (!editor) return;
    const actualFootnotes = cleanupOrphanNotes();
    const fb2Data = {
      content: editor?.getJSON(),
      footnotes: actualFootnotes,
      metadata: metadata,
    };
    photino.send("save-file", fb2Data);
  }, [editor, isLoading]);

  // Подписываемся на событие Photino
  useEffect(() => {
    photino.on("fb2-content", onFb2Content);
    return () => {
      // Обязательно отписываемся, чтобы не было утечек памяти
      photino.off("fb2-content", onFb2Content);
    };
  }, [onFb2Content]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* Верхнее меню (Файл, Сохранить) */}
      <Header editor={editor} onSave={saveFile} onOpen={openFile} />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Навигация по главам */}
        <Sidebar tree={tocTree} activePos={activeHeadingPos} editor={editor} />
        {/* Основная рабочая область */}
        <main className="flex-1 flex flex-col min-w-0 bg-gray-100">
          {/* Тулбар форматирования над листом */}
          <Toolbar
            editor={editor}
            onSelectImage={() => photino.send("select-image")}
            onAddFootnote={addFootnote}
          />
          {/* Лист редактора */}
          <EditorCanvas editor={editor} ref={scrollRef} />
        </main>
        {/* Правая панель: Метаданные */}
        <MetadataSidebar meta={metadata} onMetaChange={setMetadata} />
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
          content={footnotes[activeNote.id] || ""}
          existingIds={Object.keys(footnotes)}
          onUpdate={updateNoteContent}
          onClose={closeNotePopup}
          onDelete={deleteFootnote}
        />
      )}
      {/* Статусная строка */}
      <StatusBar fileName={loadingFileName} loading={isLoading} />
    </div>
  );
}
