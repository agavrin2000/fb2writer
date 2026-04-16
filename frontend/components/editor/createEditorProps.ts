import { ActiveNote } from "../../types/types";
import { EditorView } from "@tiptap/pm/view";
import { RefObject } from "react";
import { JSONContent } from "@tiptap/core";

/**
 * Фабрика пропсов для Tiptap, отвечающая за обработку кликов по содержимому редактора.
 * Предоставляет функцию `handleClick`, которая перехватывает клики по ссылкам и реализует кастомную логику,
 * специфичную для приложения Photino (нативное desktop-приложение с веб-интерфейсом).
 *
 * Основная задача — корректно обрабатывать внутренние ссылки (`#id`) как вызовы сносок,
 * предотвращая стандартную навигацию и показывая контент сноски во всплывающем окне.
 *
 * @param footnotesRef - Ссылка на объект, содержащий данные всех сносок, где ключ — ID, значение — содержимое.
 * @param setActiveNoteRef - Ссылка на функцию, устанавливающую активную сноску с указанием позиции клика.
 *
 * @returns Объект с функцией `handleClick`, интегрируемый в пропсы TipTap-редактора.
 *
 * @example
 * const editorProps = createEditorProps(footnotesRef, setActiveNoteRef);
 * <Editor extensions={extensions} editorProps={editorProps} />
 */
export const createEditorProps = (
  footnotesRef: RefObject<Record<string, JSONContent>>,
  setActiveNoteRef: RefObject<(note: ActiveNote) => void>,
) => ({
  /**
   * Обработчик кликов внутри редактора.
   * Перехватывает события по ссылкам и определяет, является ли ссылка внутренней меткой сноски.
   * В случае совпадения — останавливает стандартное поведение и активирует отображение сноски.
   *
   * @param view - Экземпляр представления ProseMirror.
   * @param pos - Позиция клика в документе (смещение от начала).
   * @param event - Нативное событие MouseEvent.
   * @returns `true`, если событие полностью обработано; `false` — если должно быть передано дальше.
   */
  handleClick: (view: EditorView, pos: number, event: MouseEvent) => {
    // 1. СТРОГИЙ ПЕРЕХВАТ ДЛЯ PHOTINO
    // Ищем ближайшую ссылку в DOM дереве от места клика
    const target = event.target as HTMLElement;
    const anchor = target.closest("a");
    const domHref = anchor?.getAttribute("href") || "";

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
      const noteContent = footnotesRef.current
        ? footnotesRef.current[noteId]
        : undefined;

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
  },
  transformPastedHTML(html: string) {
    return (
      html
        // 1. Удаляем все комментарии (Word их обожает)
        .replace(/<!--[\s\S]*?-->/g, "")
        // 2. Удаляем все теги, кроме p, br, b, i, strong, em
        .replace(/<(?!(\/?(p|br|b|i|strong|em|ul|ol|li))\b)[^>]+>/gi, "")
        // 3. Удаляем все атрибуты внутри оставшихся тегов (style, class, etc)
        .replace(/<([a-z][a-z0-9]*)\b[^>]*>/gi, "<$1>")
    );
  },
});
