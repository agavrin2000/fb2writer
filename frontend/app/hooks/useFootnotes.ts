import { useState, useCallback, useEffect, useRef, RefObject } from "react";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Editor } from "@tiptap/react";
import {ActiveNote, FootnotesMap, TiptapContent} from "@/types/types"
// 1. Объявляем интерфейс (или импортируем его)


export const useFootnotes = (
  editor: Editor | null,
  externalFootnotesRef: RefObject<FootnotesMap>, // Используем RefObject
  externalSetActiveNoteRef: RefObject<(note: ActiveNote | null) => void>,
) => {
  const [footnotes, setFootnotes] = useState<FootnotesMap>({});
  const [activeNote, setActiveNote] = useState<ActiveNote | null>(null);
  null;
  const footnotesRef = useRef(footnotes);

  const setActiveNoteRef = useRef(setActiveNote);
  setActiveNoteRef.current = setActiveNote;

  useEffect(() => {
    // Синхронизируем внешний и внутренний рефы при изменении стейта
    if (externalFootnotesRef) {
      externalFootnotesRef.current = footnotes;
    }
    footnotesRef.current = footnotes; // если есть внутренний
  }, [footnotes, externalFootnotesRef]);

  // Синхронизируем функцию установки активной заметки

  useEffect(() => {
    // Связываем функцию из рефа (которую дергает handleClick) со стейтом хука
    externalSetActiveNoteRef.current = (note: ActiveNote | null) => {
      setActiveNote(note);
    };
  }, [externalSetActiveNoteRef]);

  // Функция для закрытия попапа сноски
  const closeNotePopup = useCallback(() => {
    setActiveNote(null);
  }, []);

  const updateNoteContent = useCallback(
    (newContent: TiptapContent[], newId?: string) => {
      if (!activeNote || !editor) return;

      const oldId = activeNote.id;
      const finalId = newId?.trim() || oldId;

      // 1. Проверка на дубликаты
      if (finalId !== oldId && footnotes.hasOwnProperty(finalId)) {
        alert(`Ошибка: Сноска с ID "${finalId}" уже существует!`);
        return;
      }

      // 2. РАБОТА С ТЕКСТОМ КНИГИ (EDITOR)
      if (activeNote.isNew && activeNote.pos !== undefined) {
        // Сноска НОВАЯ: вставляем текст ссылки [ID]
        const linkText = `[${finalId.substring(2)}]`;
        editor
          .chain()
          .focus()
          .insertContentAt(activeNote.pos, [
            {
              type: "text",
              text: linkText,
              marks: [
                {
                  type: "link",
                  attrs: { href: `#${finalId}`, rel: "footnote" },
                },
              ],
            },
            { type: "text", text: " " },
          ])
          .run();
      } else if (finalId !== oldId) {
        // Сноска СТАРАЯ: обновляем ТОЛЬКО href ссылки в тексте, не трогая её текст
        const oldHref = `#${oldId}`;
        const newHref = `#${finalId}`;

        editor.state.doc.descendants((node: ProseMirrorNode, pos: number) => {
          const link = node.marks.find(
            (m) => m.type.name === "link" && m.attrs.href === oldHref,
          );
          if (link) {
            editor
              .chain()
              .setTextSelection({ from: pos, to: pos + node.nodeSize })
              .extendMarkRange("link")
              .setMark("link", { ...link.attrs, href: newHref })
              .run();
            return false;
          }
          return true;
        });
      }

      // 3. ОБНОВЛЕНИЕ ХРАНИЛИЩА ССЫЛОК (Без принудительной смены текста в fb2Title)
      setFootnotes((prev) => {
        const updated = { ...prev };
        if (finalId !== oldId) {
          delete updated[oldId];
        }
        // Сохраняем newContent "как есть", без модификации fb2Title
        updated[finalId] = newContent;

        footnotesRef.current = updated;
        return updated;
      });

      setActiveNote(null);
    },
    [activeNote, editor, footnotes],
  );

  // Добавить ссылку
  const addFootnote = () => {
    if (!editor || !editor.isActive("paragraph")) return;

    const { from } = editor.state.selection;
    const coords = editor.view.coordsAtPos(from);

    // Генерируем ID
    const newNoteId = `n_${Date.now().toString(36).slice(-4)}`;

    // Формируем шаблон с текущим ID
    const initialContent = [
      {
        type: "fb2Title",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: `${newNoteId.substring(2)}` }],
          },
        ],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Новая сноска" }],
      },
    ];

    // Сохраняем в стейт под временным ID
    setFootnotes((prev) => ({ ...prev, [newNoteId]: initialContent }));

    setActiveNote({
      id: newNoteId,
      x: coords.left,
      y: coords.top,
      isNew: true,
      pos: from,
    });
  };

  // УДАЛИТЬ ССЫЛКУ
  const deleteFootnote = useCallback(
    (id: string) => {
      if (!editor) return;

      // 1. Находим и удаляем все ссылки на этот ID в тексте книги
      const targetHref = `#${id}`;
      editor.state.doc.descendants((node: ProseMirrorNode, pos: number) => {
        const linkMark = node.marks.find(
          (m) => m.type.name === "link" && m.attrs.href === targetHref,
        );
        if (linkMark) {
          // Удаляем текст ссылки (например, "[n123]")
          editor.commands.deleteRange({ from: pos, to: pos + node.nodeSize });
        }
        return true;
      });

      // 2. Удаляем контент сноски из хранилища
      setFootnotes((prev) => {
        const updated = { ...prev };
        delete updated[id];
        footnotesRef.current = updated;
        return updated;
      });

      // 3. Закрываем окно
      setActiveNote(null);
    },
    [editor],
  );

  // Удалить ссылки без упоминаний в тексте
  const cleanupOrphanNotes = useCallback(() => {
    if (!editor) return footnotes;

    // 1. Собираем все уникальные ID сносок, на которые есть ссылки в тексте
    const usedIds = new Set<string>();

    editor.state.doc.descendants((node: ProseMirrorNode) => {
      const linkMark = node.marks.find(
        (m) => m.type.name === "link" && m.attrs.rel === "footnote",
      );
      if (linkMark) {
        // Убираем решетку из href (#n123 -> n123)
        const id = linkMark.attrs.href?.replace("#", "");
        if (id) usedIds.add(id);
      }
      return true;
    });

    // 2. Создаем новый объект только с теми сносками, которые используются
    const cleanedFootnotes: FootnotesMap = {};
    let removedCount = 0;

    Object.keys(footnotes).forEach((id) => {
      if (usedIds.has(id)) {
        cleanedFootnotes[id] = footnotes[id];
      } else {
        removedCount++;
      }
    });

    if (removedCount > 0) {
      setFootnotes(cleanedFootnotes);
      footnotesRef.current = cleanedFootnotes;
      // Можно вывести уведомление: toast.success(`Очищено сносок: ${removedCount}`);
    }

    return cleanedFootnotes;
  }, [editor, footnotes]);

  return {
    activeNote,
    setActiveNote,
    setFootnotes,
    footnotesRef,
    setActiveNoteRef,
    cleanupOrphanNotes,
    addFootnote,
    footnotes,
    updateNoteContent,
    closeNotePopup,
    deleteFootnote,
  };
};
