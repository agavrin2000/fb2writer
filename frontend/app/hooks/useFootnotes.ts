import { useState, useCallback, useEffect, useRef, RefObject } from "react";
import { Editor } from "@tiptap/react";
import { ActiveNote, FootnotesMap, TiptapContent } from "@/types/types";
import { useToast } from "@/hooks/ToastContext";


// 1. Объявляем интерфейс (или импортируем его)
export const useFootnotes = (
  editor: Editor | null,
  externalFootnotesRef: RefObject<FootnotesMap>, // Используем RefObject
  externalSetActiveNoteRef: RefObject<(note: ActiveNote | null) => void>,
) => {
  const [footnotes, setFootnotes] = useState<FootnotesMap>({});
  const [activeNote, setActiveNote] = useState<ActiveNote | null>(null);
  const { success: showToastSuccess, error: showToastError } = useToast();

  // Синхронизируем функцию установки активной заметки
useEffect(() => {
  if (externalSetActiveNoteRef) {
    // Мы создаем стабильную функцию-обертку один раз
    const setter = (note: ActiveNote | null) => {
      setActiveNote(note);
    };
    externalSetActiveNoteRef.current = setter;
  }
}, [externalSetActiveNoteRef]);

  // Синхронизация данных для редактора
  useEffect(() => {
    if (externalFootnotesRef) {
      externalFootnotesRef.current = footnotes;
    }
  }, [footnotes]);

  // Функция для закрытия попапа сноски
const closeNotePopup = useCallback(() => {
  setActiveNote((current) => {
    // Если мы закрываем именно НОВУЮ сноску, которую так и не сохранили
    if (current?.isNew) {
      setFootnotes((prev) => {
        const next = { ...prev };
        delete next[current.id];
        return next;
      });
    }
    editor?.commands.focus();
    return null; // Закрываем окно
  });
}, []);

  const updateNoteContent = useCallback(
    (newContent: TiptapContent[], newId?: string) => {
      if (!activeNote || !editor) return;

      const oldId = activeNote.id;
      const finalId = newId?.trim() || oldId;

      let editorSuccess = false;

      // Сначала пробуем обновить редактор
      if (activeNote.isNew && activeNote.pos !== undefined) {
        editorSuccess = editor
          .chain()
          .focus()
          .insertContentAt(activeNote.pos, [
            {
              type: "text",
              text: `[${finalId.replace(/^n_/, "")}]`, // Безопасная обрезка
              marks: [
                {
                  type: "link",
                  attrs: { href: `#${finalId}`, rel: "footnote" },
                },
              ],
            },
          ])
          .run();
      } else {
        editorSuccess = editor.commands.command(({ tr }) => {
          const oldHref = `#${oldId}`;
          const newHref = `#${finalId}`;
          const { schema } = tr.doc.type;
          let found = false;
          tr.doc.descendants((node, pos) => {
            const mark = node.marks.find(
              (m) =>
                m.type.name === "link" &&
                m.attrs.href === oldHref &&
                m.attrs.rel === "footnote",
            );
            if (mark) {
              found = true;
              if (oldId !== finalId) {
                const newMark = schema.marks.link.create({
                  ...mark.attrs,
                  href: newHref,
                });
                tr.addMark(pos, pos + node.nodeSize, newMark);
              }
            }
            return true;
          });
          return oldId === finalId ? true : found;
        });
      }

      if (editorSuccess) {
        setFootnotes((prev) => {
          // Проверка дублей внутри сеттера — теперь footnotes не нужна в зависимостях
          if (finalId !== oldId && prev[finalId]) {
            showToastError(`Ошибка: ID "${finalId}" занят`);
            return prev;
          }
          const updated = { ...prev };
          if (finalId !== oldId) delete updated[oldId];
          updated[finalId] = newContent;
          return updated;
        });
        setActiveNote(null);
      } else {
        showToastError("Не удалось привязать сноску к тексту.");
      }
    },
    [activeNote, editor, showToastError, showToastSuccess], // footnotes убрали!
  );

  // Добавить ссылку
  const addFootnote = useCallback(() => {
    const allowedTypes = ["paragraph", "fb2V", "fb2TextAuthor", "fb2Subtitle"];
    if (!editor || !allowedTypes.some((type) => editor.isActive(type))) return;

    const { from } = editor.state.selection;
    const { left: x, top: y } = editor.view.coordsAtPos(from);
    // Генерируем ID
    const id = `n_${Date.now().toString(36).slice(-4)}`;

    // Формируем шаблон с текущим ID
    const initialContent = [
      {
        type: "fb2Title",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: `${id.replace(/^n_/, "")}` }],
          },
        ],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Новая сноска" }],
      },
    ];

    // Сохраняем в стейт под временным ID
    // 4. Обновляем стейты
    setFootnotes((prev) => ({ ...prev, [id]: initialContent }));
    setActiveNote({ id, x, y, isNew: true, pos: from });
  }, [editor]);

  // УДАЛИТЬ ССЫЛКУ
  const deleteFootnote = useCallback(
    (id: string) => {
      if (!editor) return;

      const targetHref = `#${id}`;

      // Собираем все позиции ссылок, чтобы удалить их за один раз
      editor.commands.command(({ tr }) => {
        const deletions: { from: number; to: number }[] = [];

        tr.doc.descendants((node, pos) => {
          const isFootnote = node.marks.find(
            (m) =>
              m.type.name === "link" &&
              m.attrs.href === targetHref &&
              m.attrs.rel === "footnote",
          );
          if (isFootnote) {
            deletions.push({ from: pos, to: pos + node.nodeSize });
          }
          return true;
        });

        // Удаляем с конца, чтобы не поплыли индексы
        deletions.reverse().forEach(({ from, to }) => {
          tr.delete(from, to);
        });

        return true;
      });

      setFootnotes((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });

      setActiveNote(null);
    },
    [editor],
  );

  return {
    activeNote,
    setActiveNote,
    setFootnotes,
    addFootnote,
    footnotes,
    updateNoteContent,
    closeNotePopup,
    deleteFootnote,
  };
};
