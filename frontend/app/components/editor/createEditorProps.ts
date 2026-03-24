import { EditorView } from "@tiptap/pm/view";
import { RefObject } from "react";

/**
 * Фабрика пропсов для Tiptap. 
 * Фокусируется исключительно на взаимодействии с контентом документа.
 */
export const createEditorProps = (
  footnotesRef: RefObject<Record<string, any>>,
  setActiveNoteRef: RefObject<(note: any) => void>
) => ({
handleClick: (view: EditorView, pos: number, event: MouseEvent) => {
    // 1. СТРОГИЙ ПЕРЕХВАТ ДЛЯ PHOTINO
    // Ищем ближайшую ссылку в DOM дереве от места клика
    const target = event.target as HTMLElement;
    const anchor = target.closest('a');
    const domHref = anchor?.getAttribute('href') || "";

    // 2. ВАША ЛОГИКА PROSEMIRROR
    const { schema } = view.state;
    // Проверяем узел в позиции клика
    const node = view.state.doc.nodeAt(pos);
    const mark = node?.marks.find((m) => m.type === schema.marks.link);
    const markHref = (mark?.attrs.href as string) || "";

    // Приоритет отдаем ссылке из атрибута (она причина открытия окон)
    const finalHref = domHref || markHref;

    if (finalHref.startsWith("#")) {
        // ОСТАНАВЛИВАЕМ нативную навигацию WebView2 немедленно
        event.preventDefault();
        event.stopPropagation();

        const noteId = finalHref.replace("#", "");
        const noteContent = footnotesRef.current ? footnotesRef.current[noteId] : undefined;

        if (noteContent !== undefined) {
            setActiveNoteRef.current?.({
                id: noteId,
                x: event.clientX,
                y: event.clientY,
            });
            // Возвращаем true, чтобы ProseMirror не пробрасывал клик дальше
            return true; 
        }
    }
    
    return false; // Для обычных ссылок или текста позволяем стандартное поведение
}
});
