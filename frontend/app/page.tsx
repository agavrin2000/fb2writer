"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { ContentsSidebar } from "@/components/layout/ContentsSidebar";
import { MetadataSidebar } from "@/components/layout/metadata-sidebar/MetadataSidebar";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { StatusBar } from "./components/layout/Statusbar";
import { Toolbar } from "@/components/editor/Toolbar";
import { Loader } from "@/components/layout/Loader";
import { NotePopup } from "@/components/editor/NotePopup";
import { useEditorManager } from "@/hooks/useEditorManager";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { ImageBubbleMenu } from "@/components/editor/ImageBubbleMenu";
import { Fb2SectionMenu } from "@/components/editor/Fb2SectionMenu";

export default function Page() {
  // Добавляем локальное состояние сайдбара на уровне страницы

  const {
    editor,
    metadata,
    setMetadata,
    notes,
    isLoading,
    loadingFileName,
    tocTree,
    activeHeadingPos,
    actions,
    scrollToHeading,
  } = useEditorManager();

  const [isContentsSidebarOpen, setIsContentsSidebarOpen] = useState(true);
  const toggleContentsSidebar = useCallback(() => setIsContentsSidebarOpen((v) => !v), []);
  const [isMetadataSidebarOpen, setIsMetadataSidebarOpen] = useState(true);
  const toggleMetadataSidebar = useCallback(
    () => setIsMetadataSidebarOpen((v) => !v),
    [],
  );

  // 3. Собираем все действия для горячих клавиш (Ctrl+S, Ctrl+O, Alt+B)
  const allActions = useMemo(
    () => ({
      ...actions,
      toggleContentsSidebar,
      toggleMetadataSidebar,
    }),
    [actions, toggleContentsSidebar, toggleMetadataSidebar],
  );

  // Регистрируем горячие клавиши здесь
  useGlobalShortcuts(allActions);

  // Возвращаем фокус в редактор при закрытии через Alt+B
  useEffect(() => {
    if (!isContentsSidebarOpen && editor) {
      setTimeout(() => editor.commands.focus(), 50);
    }
  }, [isContentsSidebarOpen, editor]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      <Header editor={editor} onSave={actions.save} onOpen={actions.open} />

      <div className="flex flex-1 overflow-hidden relative">
        <ContentsSidebar
          tree={tocTree}
          activePos={activeHeadingPos}
          onSelectHeading={scrollToHeading}
          isOpen={isContentsSidebarOpen}
          onToggle={toggleContentsSidebar}
        />

        <main className="flex-1 flex flex-col min-w-0 bg-gray-100">
          <Toolbar
            editor={editor}
            onSelectImage={actions.selectImage}
            onAddFootnote={notes.addFootnote}
          />
          <EditorCanvas editor={editor} />
        </main>

        <MetadataSidebar
          meta={metadata}
          onMetaChange={setMetadata}
          isOpen={isMetadataSidebarOpen}
          onToggle={toggleMetadataSidebar}
        />
      </div>
      {/* Всплывающее меню для картинок */}
      <ImageBubbleMenu editor={editor} />
      {/* Всплывающее меню для секций 
      <SectionBubbleMenu editor={editor} />
*/}
      <Fb2SectionMenu editor={editor} 
                  onSelectImage={actions.selectImage}
/>
      {isLoading && <Loader fileName={loadingFileName} />}

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

      <StatusBar fileName={loadingFileName} loading={isLoading} />
    </div>
  );
}
