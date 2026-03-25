import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useFB2Editor } from "./useFB2Editor";
import { useFootnotes } from "./useFootnotes";
import { usePhotinoEvents } from "./usePhotinoEvents";
import { Fb2Metadata, Fb2Data, TocItem, Fb2ImageData } from "../types/types";
import { ToastHandle } from "@/components/ui/Toast";
import { photino } from "@/api/photino";
import { NodeSelection } from "@tiptap/pm/state";


export function useEditorManager(toastRef: React.RefObject<ToastHandle | null>) {
  // --- РЕФЫ И СОСТОЯНИЕ ---
  const footnotesRef = useRef<Record<string, any>>({});
  const setActiveNoteRef = useRef<(note: any) => void>(() => { });

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

  const onImageSelected = useCallback((payload: string) => {
    const imageData = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const chain = fb2.editor.chain().focus();

    if (imageData.display === 'block') {

      // Вставляем как блочный узел
      chain.insertContent({
        type: 'fb2BlockImage',
        attrs: { src: imageData.data, href: imageData.href }
      })
        .focus()
        .run();
    }
    else if (imageData.display === 'inline') {
      // Вставляем как строчный узел
      chain.focus().insertContent({
        type: 'fb2InlineImage',
        attrs: { src: imageData.data, href: imageData.href }
      })
        .focus()
        .run();

    }
    else if (imageData.display === 'section') {
      const { state } = fb2.editor;
      const { $from } = state.selection;

      let sectionNode = null;
      let sectionPos = -1;
      let depth = -1;

      // 1. Проверяем: выделена ли сама секция?
      if (
        state.selection instanceof NodeSelection &&
        (state.selection.node.type.name === "fb2Section" || state.selection.node.type.name === "fb2BodySection")
      ) {
        sectionPos = state.selection.from;
        sectionNode = state.selection.node;
      }
      // 2. Если нет — ищем родительскую секцию вверх по дереву
      else {
        // 1. Ищем ближайшего подходящего родителя вверх по дереву
        for (let d = $from.depth; d >= 0; d--) {
          const node = $from.node(d);
          if (node.type.name === "fb2BodySection" || node.type.name === "fb2Section") {
            sectionNode = node;
            sectionPos = $from.before(d);
            depth = d;
            break;
          }
        }
      }

      if (!sectionNode) return;

      // 2. Определяем позицию вставки внутри найденной секции
      let insertRelativePos = 0; // Позиция относительно начала контента секции

      if (sectionNode.type.name === "fb2BodySection") {
        // Для BodySection: всегда в самое начало (первым элементом после заглушки)
        insertRelativePos = 1;
      }
      else if (sectionNode.type.name === "fb2Section") {
        // Для Section: после Title и всех Epigraph
        let lastHeaderElementIndex = -1;

        sectionNode.forEach((child, offset, index) => {
          if (child.type.name === "fb2Title" || child.type.name === "fb2Epigraph") {
            lastHeaderElementIndex = offset + child.nodeSize;
          }
        });

        insertRelativePos = lastHeaderElementIndex !== -1 ? lastHeaderElementIndex : 0;
      }

      let existingNode = null;

      if (sectionNode.type.name === "fb2BodySection") {
        // В BodySection плейсхолдер — это child(0). Изображение должно быть child(1).
        existingNode = sectionNode.childCount > 1 ? sectionNode.child(1) : null;
      } else {
        // Для обычной секции используем ваш проверенный метод через childAfter
        const { node } = sectionNode.childAfter(insertRelativePos);
        existingNode = node;
      }

      if (existingNode && existingNode.type.name === "fb2Blockimage") {
        toastRef?.current?.show("Изображение уже есть", "error");
        return;
      }

      // 4. Выполняем вставку по абсолютной позиции в документе
      const absoluteInsertPos = sectionPos + 1 + insertRelativePos;

      fb2.editor.chain()
        .insertContentAt(absoluteInsertPos, {
          type: "fb2BlockImage",
          attrs: { src: imageData.data, href: imageData.href }
        })
        .focus(absoluteInsertPos + 1)
        .run();
    }
  }, [fb2.editor, toastRef]);

  const onStartLoading = useCallback((name: string) => {
    setIsLoading(true);
    setLoadingFileName(name || "Загрузка...");
  }, []);

  const onCancelLoading = useCallback(() => {
    setIsLoading(false);
    setLoadingFileName("");
  }, []);

  const onSaveSuccess = useCallback(() => {
    toastRef?.current?.show("Изменения сохранены", "success");
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
