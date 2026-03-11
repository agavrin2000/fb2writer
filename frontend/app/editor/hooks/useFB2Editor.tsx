'use client';

import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Fb2Metadata, IPhotinoBridge, TocItem } from '../../types/types';
import { photino } from '../../api/photino';
import { buildTree } from '../../utils/utils';
import { Fb2Table, Fb2TableRow, Fb2TableCell } from '../../editor/extensions/fb2table';
import { Fb2Section } from '../../editor/extensions/fb2section';
import { Fb2Title } from '../extensions/fb2title';
import { Fb2Cite } from '../extensions/fb2cite';
import { Fb2CustomStyle } from '../extensions/fb2customstyle';
import { Fb2Epigraph } from '../extensions/fb2epigraph';
import { Fb2Note } from '../extensions/fb2note';
import { Fb2Poem } from '../extensions/fb2poem';
import { Fb2Stanza } from '../extensions/fb2stanza';
import { Fb2Subtitle } from '../extensions/fb2subtitle';
import { Fb2TextAuthor } from '../extensions/fb2textauthor';
import { Fb2V } from '../extensions/fb2v';

export const useFB2Editor = () => {
    const [metadata, setMetadata] = useState<Fb2Metadata>({ Title: '', Author: '' });
    const [tocTree, setTocTree] = useState<TocItem[]>([]);
    const [activeHeadingPos, setActiveHeadingPos] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingFileName, setLoadingFileName] = useState('');
    const [activeNote, setActiveNote] = useState<{ id: string; text: string; x: number; y: number } | null>(null);
    const [footnotes, setFootnotes] = useState<Record<string, string>>({});
    const footnotesRef = useRef<Record<string, string>>({});

    // Функция для закрытия попапа
    const closeNotePopup = useCallback(() => {
        setActiveNote(null);
    }, []);

    // 2. Обновление текста конкретной сноски
    const updateNoteText = useCallback((newText: string) => {
        if (activeNote) {
            const updated = { ...footnotes, [activeNote.id]: newText };
            setFootnotes(updated);
            footnotesRef.current = updated;
        }
    }, [activeNote, footnotes]);

    const addFootnote = () => {
        const noteId = prompt("Введите ID примечания (например: note1):");
        const noteText = prompt("Введите текст примечания:");

        if (noteId && noteText) {
            // 1. Создаем ссылку в тексте
            editor?.chain().focus().setLink({ href: `#${noteId}` }).run();

            // 2. Отправляем текст сноски в C#, чтобы он сохранил его в отдельный список
            photino.send('add-note', JSON.stringify({ id: noteId, text: noteText }));
        }
    };

    const getPhotino = () => (typeof window !== 'undefined' ? (window as any).external as IPhotinoBridge : null);


    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { class: 'fb2-note-link text-blue-600 underline cursor-pointer', 'data-type': 'note' },
            }),
            Image.configure({ inline: false, allowBase64: true, HTMLAttributes: { class: 'mx-auto rounded-lg shadow-md my-4' } }),
            Fb2Section,
            Fb2Title,
            Fb2Cite,
            Fb2CustomStyle,
            Fb2Epigraph,
            Fb2Note,
            Fb2Poem,
            Fb2Stanza,
            Fb2Subtitle,
            Fb2TextAuthor,
            Fb2V
        ],
        editorProps: {
            handleClick: (view, pos, event) => {
                const { schema } = view.state;
                const node = view.state.doc.nodeAt(pos);
                const mark = node?.marks.find(m => m.type === schema.marks.link);
                if (mark) {
                    // Очищаем ID от решетки (#note1 -> note1)
                    const noteId = mark.attrs.href.replace('#', '');
                    // Берем текст из нашего словаря в стейте
                    const noteContent = footnotesRef.current[noteId];
                    if (noteContent !== undefined) {
                        setActiveNote({ id: noteId, text: noteContent, x: event.clientX, y: event.clientY });
                        return true; // Останавливаем стандартное событие
                    }
                }
                setActiveNote(null);
                return false;
            }
        },
        content: '<p>Загрузка...</p>',
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            const flatNodes: { pos: number, text: string, level: number }[] = [];
            editor.state.doc.descendants((node, pos) => {
                if (node.type.name === 'heading') {
                    flatNodes.push({ pos, text: node.textContent || 'Глава без названия', level: node.attrs.level });
                }
            });
            setTocTree(buildTree(flatNodes));
            // Сразу ищем активный элемент после обновления
            const { from } = editor.state.selection;
            let active = null;
            flatNodes.forEach(n => { if (n.pos <= from) active = n.pos; });
            setActiveHeadingPos(active);
        },
    });

    // Photino messages
    const handleIncomingMessage = useCallback((message: string) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'start-loading':
                    setIsLoading(true);
                    setLoadingFileName(data.payload || 'Обработка...');
                    break;

                case 'fb2-content':
                    if (editor && data.payload) {
                        const fb2data = JSON.parse(data.payload);
                        if (fb2data.EditorContent) {
                            editor.commands.setContent(fb2data.EditorContent);
                        }
                        setMetadata(fb2data.Metadata || {});
                        // загружаем сноски
                        if (fb2data.Footnotes) {
                            setFootnotes(fb2data.Footnotes);
                            footnotesRef.current = fb2data.Footnotes;
                        }
                        else {
                            setFootnotes({}); // Очищаем, если в книге нет сносок
                        }
                        setIsLoading(false);
                        setLoadingFileName('');
                    }
                    break;

                case 'insert-image':
                    if (editor && data.url) {
                        editor.chain().focus().setImage({ src: data.url }).run();
                    }
                    break;

                case 'save-success':
                    alert(`Книга успешно сохранена: ${data.path}`);
                    break;

                case 'error':
                    setIsLoading(false);
                    alert(`Ошибка: ${data.msg}`);
                    break;

                case 'cancel-loading':
                    setIsLoading(false);
                    setLoadingFileName('');
                    break;
            }
        } catch (e) {
            console.error("Ошибка парсинга сообщения от .NET:", e);
        }
    }, [editor, setMetadata, setIsLoading]);
    useEffect(() => {
        // 1. Создаем функцию в глобальном пространстве (window)
        // Именно её будет вызывать Photino при выполнении SendMessage в C#
        (window as any).receiveMessageFromCSharp = (message: string) => {
            console.log("📩 Сообщение получено из C#:", message);
            handleIncomingMessage(message);
        };

        const photino = (window as any).external;

        if (photino && typeof photino.receiveMessage === 'function') {
            try {
                // 2. Регистрируем нашу ГЛОБАЛЬНУЮ функцию в Photino
                // Передаем ссылку на функцию, а не вызываем её!
                photino.receiveMessage((window as any).receiveMessageFromCSharp);
                console.log("✅ Подписка Photino установлена");
            } catch (e) {
                console.error("❌ Ошибка при регистрации в Photino:", e);
            }
        }
        return () => {
            // Очистка при размонтировании
            delete (window as any).receiveMessageFromCSharp;
        };
    }, [handleIncomingMessage]);


    useEffect(() => {
        // Обработчик для загрузки контента
        const onFb2Content = (payload: any) => {
            // В вашем photino.ts payload уже распарсен (если пришел JSON)
            // Но так как внутри payload у вас еще один JSON (EditorContent и т.д.), парсим его:
            const fb2data = typeof payload === 'string' ? JSON.parse(payload) : payload;

            if (editor && fb2data) {
                if (fb2data.EditorContent) {
                    editor.commands.setContent(fb2data.EditorContent);
                }
                setMetadata(fb2data.Metadata || {});

                if (fb2data.Footnotes) {
                    setFootnotes(fb2data.Footnotes);
                    footnotesRef.current = fb2data.Footnotes;
                } else {
                    setFootnotes({});
                }
                setIsLoading(false);
                setLoadingFileName('');
            }
        };

        // Другие мелкие обработчики
        const onStartLoading = (payload: string) => {
            setIsLoading(true);
            setLoadingFileName(payload || 'Обработка...');
        };

        const onInsertImage = (url: any) => {
            if (editor) editor.chain().focus().setImage({ src: url }).run();
        };
        const onSaveSuccess = (path: string) => alert(`Книга сохранена: ${path}`);
        const onCancelLoading = () => {
            setIsLoading(false);
            setLoadingFileName('');
        };

        const onError = (payload: any) => {
            setIsLoading(false);
            alert(`Ошибка: ${payload}`);
        };

        // Подписываемся на события из PhotinoBridge
        photino.on('fb2-content', onFb2Content);
        photino.on('start-loading', onStartLoading);
        photino.on('insert-image', onInsertImage);
        photino.on('error', onError);
        photino.on('save-success', onSaveSuccess);
        photino.on('cancel-loading', onCancelLoading);

        return () => {
            // Обязательно отписываемся, чтобы не было утечек памяти
            photino.off('fb2-content', onFb2Content);
            photino.off('start-loading', onStartLoading);
            photino.off('insert-image', onInsertImage);
            photino.off('error', onError);
            photino.off('save-success', onSaveSuccess);
            photino.off('cancel-loading', onCancelLoading);
        };
    }, [editor, setMetadata, setIsLoading, setFootnotes]);

















    // Функции-обертки для отправки команд в C#
    const openFile = useCallback(() => {
        // Добавляем проверку, чтобы не открывать окно выбора файла дважды
        if (isLoading) return;

        photino.send('open-file', { action: 'select_new' });
    }, [isLoading]);

    const saveFile = useCallback(() => {
        if (!editor || isLoading) return;
        if (!editor) return;
        const content = JSON.stringify(editor.getJSON());
        photino.send('save-file', content);
    }, [editor, isLoading]);


    return {
        editor,
        metadata,
        setMetadata,
        tocTree,
        activeHeadingPos,
        setActiveHeadingPos,
        isLoading,
        loadingFileName,
        setIsLoading,
        activeNote,
        setActiveNote, // Понадобится TipTap для открытия окна
        footnotes,
        closeNotePopup,
        updateNoteText,
        footnotesRef, // Передаем реф для использования в editorProps
        openFile,
        saveFile,
        getPhotino
    };
};
