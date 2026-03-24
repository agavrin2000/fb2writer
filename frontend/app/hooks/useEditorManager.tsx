import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useFB2Editor } from "./useFB2Editor";
import { useFootnotes } from "./useFootnotes";
import { usePhotinoEvents } from "./usePhotinoEvents";
import { Fb2Metadata, Fb2Data, TocItem } from "../types/types";
import { ToastHandle } from "@/components/ui/Toast";
import { photino } from "@/api/photino";


export function useEditorManager() {
  // --- РЕФЫ И СОСТОЯНИЕ ---
  const footnotesRef = useRef<Record<string, any>>({});
  const setActiveNoteRef = useRef<(note: any) => void>(() => { });
  const toastRef = useRef<ToastHandle>(null);

  const [metadata, setMetadata] = useState<Fb2Metadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingFileName, setLoadingFileName] = useState("");
  const [currentFilePath, setCurrentFilePath] = useState<string>("");
  // 1. Сначала инициализируем Редактор (ему больше не нужны actions)
  const fb2 = useFB2Editor(footnotesRef, setActiveNoteRef);

  // 2. Инициализируем Сноски
  const notes = useFootnotes(fb2.editor, footnotesRef, setActiveNoteRef);

  // --- ОБРАБОТЧИКИ СОБЫТИЙ (Incoming) ---

  const onFb2Content = useCallback((payload: Fb2Data) => {
    const data = typeof payload === "string" ? JSON.parse(payload) : payload;
    if (!fb2.editor || !data) return;

    setMetadata(data.Meta || {});
    if (data.Footnotes) {
      notes.setFootnotes(data.Footnotes);
      if (footnotesRef.current) footnotesRef.current = data.Footnotes;
    } else {
      notes.setFootnotes({});
    }

    if (data.EditorContent) {
      fb2.editor.commands.setContent(data.EditorContent);

      // Очищаем историю (сбрасываем стеки undo/redo)
      const { dispatch, state } = fb2.editor.view;

      
      dispatch(state.tr.setMeta('history$', null));
    }

    setIsLoading(false);
    if (data.FilePath) {
      setCurrentFilePath(data.FilePath);
    }
    setLoadingFileName("");
  }, [fb2.editor, notes]);

  const onImageSelected = useCallback((base64: string) => {
    fb2.editor?.chain().focus().setImage({ src: base64 }).run();
  }, [fb2.editor]);

  const onStartLoading = useCallback((name: string) => {
    setIsLoading(true);
    setLoadingFileName(name || "Загрузка...");
  }, []);

  const onCancelLoading = useCallback(() => {
    setIsLoading(false);
    setLoadingFileName("");
  }, []);

  const onSaveSuccess = useCallback(() => {
    toastRef.current?.show("Изменения сохранены");
  }, []);

  /*useEffect(() => {
  if (!fb2.editor) return;

  const handleLinkClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const link = target.closest('a');

    if (link) {
      const href = link.getAttribute('href');
      
      // Если это внутренняя ссылка (сноска)
      if (href?.startsWith('#')) {
        event.preventDefault(); // ГЛАВНОЕ: отменяем открытие нового окна
        event.stopPropagation();

        const noteId = href.slice(1);
        console.log("Клик по сноске:", noteId);
        
        // Здесь вызываем вашу логику открытия сноски
        // notes.openNote(noteId); 
      }
    }
  };

  // Слушаем клики внутри контейнера редактора
  document.addEventListener('click', handleLinkClick);
  return () => document.removeEventListener('click', handleLinkClick);
}, [fb2.editor]);
*/
  // Регистрация событий Photino
  const eventHandlers = useMemo(() => ({
    "fb2-content": onFb2Content,
    "image-selected": onImageSelected,
    "start-loading": onStartLoading,
    "cancel-loading": onCancelLoading,
    "save-success": onSaveSuccess,
  }), [onFb2Content, onImageSelected, onStartLoading, onCancelLoading, onSaveSuccess]);

  usePhotinoEvents(eventHandlers);

  // --- МЕТОДЫ ДЕЙСТВИЙ (Outgoing) ---

  const saveFile = useCallback(() => {
    if (!fb2.editor || isLoading) return;

    const actualFootnotes = notes.cleanupOrphanNotes();
    photino.send("save-file", {
      content: fb2.editor.getJSON(),
      footnotes: actualFootnotes,
      metadata: metadata,
    });
  }, [fb2.editor, isLoading, metadata, notes]);

  const openFile = useCallback(() => {
    if (isLoading) return;
    photino.send("open-file", { action: "select_new" });
  }, [isLoading]);

  const selectImage = useCallback((type: 'block' | 'inline' | 'section' = 'block') => {
    // Отправляем объект с данными, чтобы бэкенд знал, какой тип вставки использовать
    photino.send("select-image", { type });
  }, []);

  const addLink = useCallback(() => {
    if (!fb2.editor) return;
    const { empty } = fb2.editor.state.selection;
    if (empty) return;

    // Устанавливаем "пустую" ссылку. 
    // Это активирует марку link, и BubbleMenu тут же всплывет для ввода URL.
    fb2.editor.chain()
      .extendMarkRange('link') // Чтобы не плодить вложенные ссылки
      .setLink({
        href: '', // Пустое значение, чтобы заполнил пользователь в BubbleMenu
        target: null,
        rel: 'noopener noreferrer'
      })
      .run();
    window.dispatchEvent(new CustomEvent('fb2-force-link-focus'));
  }, [fb2.editor]);

  // --- ИТОГОВЫЙ ОБЪЕКТ ---
  return {
    editor: fb2.editor,
    metadata,
    setMetadata,
    isLoading,
    loadingFileName,
    currentFilePath,
    tocTree: fb2.tocTree,
    activeHeadingPos: fb2.activeHeadingPos,
    toastRef,
    notes,
    actions: {
      save: saveFile,
      open: openFile,
      selectImage: selectImage,
      addFootnote: notes.addFootnote,
      addLink,
    },
    scrollToHeading: fb2.scrollToHeading,
  };
}
