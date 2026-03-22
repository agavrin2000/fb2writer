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
    const { schema } = view.state;
    const node = view.state.doc.nodeAt(pos);
    
    const mark = node?.marks.find((m) => m.type === schema.marks.link);
    const href = (mark?.attrs.href as string) || "";

    if (mark && href.startsWith("#")) {
      const noteId = href.replace("#", "");
      const noteContent = footnotesRef.current ? footnotesRef.current[noteId] : undefined;

      if (noteContent !== undefined) {
        event.preventDefault();
        setActiveNoteRef.current?.({
          id: noteId,
          x: event.clientX,
          y: event.clientY,
        });
        return true; 
      }
    }

    setActiveNoteRef.current?.(null);
    return false;
  },
});
