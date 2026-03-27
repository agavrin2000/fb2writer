"use client";
import { Toast, ToastHandle } from "@/components/ui/Toast";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { ContentsSidebar } from "@/components/layout/ContentsSidebar";
import { MetadataSidebar } from "@/components/layout/metadata-sidebar/MetadataSidebar";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { StatusBar } from "@/components/layout/StatusBar";
import { Toolbar } from "@/components/editor/Toolbar";
import { Loader } from "@/components/layout/Loader";
import { NotePopup } from "@/components/editor/NotePopup";
import { useEditorManager } from "@/hooks/useEditorManager";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { ImageBubbleMenu } from "@/components/editor/ImageBubbleMenu";
import { LinkBubbleMenu } from "@/components/editor/LinkBubbleMenu";
import { Fb2SectionMenu } from "@/components/editor/Fb2SectionMenu";
import { Fb2PoemMenu } from "@/components/editor/Fb2PoemMenu";
import { getFileName } from "@/utils/utils";
import { ConfirmDialog, ConfirmHandle } from '@/components/ui/ConfirmDialog';

export default function Page() {
  // Добавляем локальное состояние сайдбара на уровне страницы
  const toastRef = useRef<ToastHandle>(null);
  const confirmRef = useRef<ConfirmHandle>(null);

  // Передаем реф (теперь типы совпадут)
  const fb2 = useEditorManager(toastRef, confirmRef);
  const {
    editor,
    metadata,
    handleMetaChange,
    notes,
    isLoading,
    loaderConfig,
    loadingFileName,
    currentFilePath,
    tocTree,
    activeHeadingPos,
    actions,
    scrollToHeading,
  } = fb2;

  const [isContentsSidebarOpen, setIsContentsSidebarOpen] = useState(false);
  const toggleContentsSidebar = useCallback(() => setIsContentsSidebarOpen((v) => !v), []);
  const [isMetadataSidebarOpen, setIsMetadataSidebarOpen] = useState(false);
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
      <Header editor={editor} onSave={actions.save} onNew={actions.newFile} onOpen={actions.open} fileName={getFileName(currentFilePath)} />

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
            onAddLink={actions.addLink}
          />
          <EditorCanvas editor={editor} />
        </main>

        <MetadataSidebar
          meta={metadata}
          onMetaChange={handleMetaChange}
          isOpen={isMetadataSidebarOpen}
          onToggle={toggleMetadataSidebar}
        />
      </div>
      {/* Всплывающее меню для картинок */}
      <ImageBubbleMenu editor={editor} />
      <LinkBubbleMenu editor={editor} />

      <Fb2SectionMenu editor={editor}
        onSelectImage={actions.selectImage}
      />
      <Fb2PoemMenu editor={editor} />

      {isLoading && <Loader fileName={loadingFileName} title={loaderConfig?.title} subtitle={loaderConfig?.subtitle} />}

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
      <Toast ref={toastRef} />
      <StatusBar fileName={getFileName(currentFilePath)} loading={isLoading} />
      <ConfirmDialog ref={confirmRef} />
    </div>
  );
}
