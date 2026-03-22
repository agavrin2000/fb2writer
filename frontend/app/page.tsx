"use client";
import { Header } from "./components/layout/header";
import { Sidebar } from "./components/navigation/sidebar";
import { MetadataSidebar } from "./components/navigation/metadata-sidebar";
import { EditorCanvas } from "./components/editor/canvas";
import { StatusBar } from "./components/layout/statusbar";
import { Toolbar } from "./components/editor/toolbar";
import { Loader } from "./components/editor/loader";
import { NotePopup } from "./components/editor/note-popup";
import { useEditorManager } from "./editor/hooks/useEditorManager";
import { useGlobalShortcuts } from "./editor/hooks/useGlobalShortcuts";
import { ImageBubbleMenu } from "./components/editor/image-bubble-menu";
import { Fb2SectionMenu } from "./components/ui/Fb2SectionMenu";
//import { SectionBubbleMenu } from "./components/editor/section-bubble-menu";
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  RefObject,
  useCallback,
} from "react";

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

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const toggleSidebar = useCallback(() => setIsSidebarOpen((v) => !v), []);
  const [isMetadataSidebarOpen, setIsMetadataSidebarOpen] = useState(true);
  const toggleMetadataSidebar = useCallback(
    () => setIsMetadataSidebarOpen((v) => !v),
    [],
  );

  // 3. Собираем все действия для горячих клавиш (Ctrl+S, Ctrl+O, Alt+B)
  const allActions = useMemo(
    () => ({
      ...actions,
      toggleSidebar,
      toggleMetadataSidebar,
    }),
    [actions, toggleSidebar, toggleMetadataSidebar],
  );

  // Регистрируем горячие клавиши здесь
  useGlobalShortcuts(allActions);

  // Возвращаем фокус в редактор при закрытии через Alt+B
  useEffect(() => {
    if (!isSidebarOpen && editor) {
      setTimeout(() => editor.commands.focus(), 50);
    }
  }, [isSidebarOpen, editor]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      <Header editor={editor} onSave={actions.save} onOpen={actions.open} />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          tree={tocTree}
          activePos={activeHeadingPos}
          onSelectHeading={scrollToHeading}
          isOpen={isSidebarOpen}
          onToggle={toggleSidebar}
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
      <Fb2SectionMenu editor={editor} />
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
