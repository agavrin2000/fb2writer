'use client';

import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Fb2Metadata, TocItem } from '../../types/types';
import { photino } from '../../api/photino';
import { buildTree } from '../../utils/utils';
import { Fb2Table, Fb2TableRow, Fb2TableCell } from '../../editor/extensions/fb2table';
import { Fb2Section } from '../../editor/extensions/fb2section';
import { Fb2Title } from '../extensions/fb2title';
import { Fb2Cite } from '../extensions/fb2cite';
import { Fb2CustomStyle } from '../extensions/fb2customstyle';
import { Fb2Epigraph } from '../extensions/fb2epigraph';
import { Fb2Poem } from '../extensions/fb2poem';
import { Fb2Stanza } from '../extensions/fb2stanza';
import { Fb2Subtitle } from '../extensions/fb2subtitle';
import { Fb2TextAuthor } from '../extensions/fb2textauthor';
import { Fb2V } from '../extensions/fb2v';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { EditorView } from '@tiptap/pm/view';
import { Editor } from '@tiptap/react';
import { Transaction } from '@tiptap/pm/state'; 

// 1. Инлайновое изображение (для параграфов)
const InlineImage = Image.extend({
    name: 'inlineImage', // Важно: другое имя!
    inline: true,
    group: 'inline',
    selectable: true,
    draggable: true,
    addAttributes() {
        return {
            ...this.parent?.(),
            class: { default: 'inline-block align-bottom mx-1 max-w-full h-auto' }
        }
    }
}).configure({ allowBase64: true });

// 2. Блочное изображение (для структуры FB2)
const BlockImage = Image.extend({
    name: 'blockImage', // Важно: другое имя!
    inline: false,
    group: 'block',
    selectable: true,
    draggable: true,
    addAttributes() {
        return {
            ...this.parent?.(),
            class: { default: 'block mx-auto my-4 rounded-lg shadow-md max-w-full' }
        }
    }
}).configure({ allowBase64: true });

interface FlatNode {
    pos: number;
    text: string;
    level: number;
}

function debounce<T extends (...args: any[]) => any>(fn: T, ms: number) {
    let timeoutId: ReturnType<typeof setTimeout>;
    return function (this: any, ...args: Parameters<T>) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), ms);
    };
}

const EDITOR_EXTENSIONS = [
    StarterKit.configure({
        // Заголовки разных уровней
        heading: { levels: [1, 2, 3, 4] },
        // Настройка цитат
        blockquote: {
            HTMLAttributes: {
                class: 'border-l-4 border-gray-300 pl-4 italic my-4',
            },
        },
        // Настройка встроенного кода
        code: {
            HTMLAttributes: {
                class: 'bg-gray-100 rounded px-1 py-0.5 font-mono text-sm',
            },
        },
        link: false,
    }),
    Superscript, // Верхний индекс <sup>
    Subscript,   // Нижний индекс <sub>            
    Link.configure({
        openOnClick: false,
        HTMLAttributes: {
            rel: 'noopener noreferrer', // дефолт
        },
        // Позволяем динамически менять rel для сносок
        validate: href => /^https?:\/\/|^\#/.test(href), // разрешаем ссылки на #id
    }),
    InlineImage,
    BlockImage,
    Fb2Section,
    Fb2Title,
    Fb2Cite,
    Fb2CustomStyle,
    Fb2Epigraph,
    Fb2Poem,
    Fb2Stanza,
    Fb2Subtitle,
    Fb2TextAuthor,
    Fb2V
];

export const useFB2Editor = () => {
    console.log("RENDER")
    const [metadata, setMetadata] = useState<Fb2Metadata | null>(null);
    const [tocTree, setTocTree] = useState<TocItem[]>([]);
    const [activeHeadingPos, setActiveHeadingPos] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingFileName, setLoadingFileName] = useState('');
    const [activeNote, setActiveNote] = useState<{
        id: string; x: number; y: number;
        isNew?: boolean;
        pos?: number;
    } | null>(null);
    const [footnotes, setFootnotes] = useState<Record<string, any>>({});
    const footnotesRef = useRef<Record<string, any>>({});
    // Реф для хранения плоского списка заголовков (обновляется только при изменении текста)
    const flatNodesRef = useRef<FlatNode[]>([]);
    // Функция поиска активного заголовка (вынесена для переиспользования)
    const lastActivePos = useRef<number | null>(null);

    const updateActiveHeading = useCallback((editor: any) => {
        const { from } = editor.state.selection;
        let active = null;

        // 1. Быстрый поиск в массиве (уже хорошо работает)
        for (const node of flatNodesRef.current) {
            if (node.pos <= from) {
                active = node.pos;
            } else {
                break;
            }
        }
        // Обновляем стейт React ТОЛЬКО если мы перешли к ДРУГОМУ заголовку
        if (active !== lastActivePos.current) {
            lastActivePos.current = active;
            setActiveHeadingPos(active); // Теперь рендер случится 1 раз при смене главы
        }
    }, []);
    const lastFlatNodes = useRef<string>('');
    const updateActiveHeadingRef = useRef(updateActiveHeading);
    updateActiveHeadingRef.current = updateActiveHeading;

    // Создаем "отложенную" версию обновления дерева
    const debouncedSetToc = useMemo(
        () => debounce((nodes: FlatNode[]) => {
            // Сравниваем только структуру (текст заголовков и их количество)
            const currentCheck = nodes.map(n => n.text).join('|');

            if (currentCheck !== lastFlatNodes.current) {
                lastFlatNodes.current = currentCheck;
                console.log("СТРУКТУРА ИЗМЕНИЛАСЬ: Обновляем оглавление");
                setTocTree(buildTree(nodes)); // Этот вызов вызывает RENDER
            }
        }, 1000), // Увеличьте до 1000мс для теста
        []
    );
    const setActiveNoteRef = useRef(setActiveNote);
    setActiveNoteRef.current = setActiveNote;
    const editorProps = useMemo(() => ({
        /*        attributes: {
                    spellcheck: 'false',
                autocorrect: 'off',
                autocapitalize: 'off'            
                },*/
        handleClick: (view: EditorView, pos: number, event: MouseEvent) => {
        const { schema } = view.state;
        const node = view.state.doc.nodeAt(pos);
        const mark = node?.marks.find(m => m.type === schema.marks.link);
        const href = (mark?.attrs.href as string) || "";

        if (mark && href.startsWith('#')) {
            const noteId = href.replace('#', '');
            
            // Используем .current, чтобы всегда иметь свежие данные без ререндера editor
            const noteContent = footnotesRef.current[noteId]; 
            
            if (noteContent !== undefined) {
                event.preventDefault();
                // Вызываем функцию через реф
                setActiveNoteRef.current({ 
                    id: noteId, 
                    x: event.clientX, 
                    y: event.clientY 
                });
                return true; 
            }
        }
        setActiveNoteRef.current(null);
        return false;
    }
}), []); 

   const editorOptions = useMemo(() => ({
    extensions: EDITOR_EXTENSIONS,
    content: '<p>Загрузка...</p>',
    immediatelyRender: false,
    editorProps: editorProps,

        onUpdate: ({ editor, transaction }: { editor: Editor; transaction: Transaction }) => {
        // Если текст не менялся (только курсор) — выходим, 
        // так как это покроет onSelectionUpdate ниже
        if (!transaction.docChanged) return;

        // Сбор данных делаем СИНХРОННО (это быстро), чтобы реф всегда был актуален
        const nodes: FlatNode[] = [];
        editor.state.doc.descendants((node, pos) => {
            if (node.type.name === 'fb2Section') {
                const title = node.firstChild?.type.name === 'fb2Title'
                    ? node.firstChild.textContent.trim()
                    : 'Глава без названия';
                nodes.push({ pos, text: title, level: node.attrs.level || 1 });
                return true;
            }
            return false;
        });

        flatNodesRef.current = nodes;

        // Тяжелые операции уводим в очередь
        requestAnimationFrame(() => {
            debouncedSetToc(nodes);
            updateActiveHeadingRef.current(editor);
        });
    },

    onSelectionUpdate: ({ editor }: { editor: Editor }) => {
        // Для кликов и навигации используем только поиск активной главы
        // без пересбора всего дерева оглавления
        updateActiveHeadingRef.current(editor);
    },
    // ВАЖНО: добавь все зависимости здесь!
}), [editorProps, debouncedSetToc]);

// MAIN Editor
const editor = useEditor(editorOptions);


useEffect(() => {
    // Обработчик для загрузки контента
    const onFb2Content = (payload: any) => {
        // В вашем photino.ts payload уже распарсен (если пришел JSON)
        // Но так как внутри payload у вас еще один JSON (EditorContent и т.д.), парсим его:
        const fb2data = typeof payload === 'string' ? JSON.parse(payload) : payload;
        console.log(fb2data);

        if (editor && fb2data) {
            if (fb2data.EditorContent) {
                editor.commands.setContent(fb2data.EditorContent);
            }
            setMetadata(fb2data.Meta || {});
            if (fb2data.Footnotes) {
                setFootnotes(fb2data.Footnotes);
                footnotesRef.current = fb2data.Footnotes;
            } else {
                setFootnotes({});
            }
            console.log("Пришло", fb2data.Footnotes)
            console.log("Footnotes", footnotesRef)
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


// Функция для закрытия попапа
const closeNotePopup = useCallback(() => {
    setActiveNote(null);
}, []);


const updateNoteContent = useCallback((newContent: any, newId?: string) => {
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
        editor.chain()
            .focus()
            .insertContentAt(activeNote.pos, [
                {
                    type: 'text',
                    text: linkText,
                    marks: [{ type: 'link', attrs: { href: `#${finalId}`, rel: 'footnote' } }]
                },
                { type: 'text', text: ' ' }
            ])
            .run();
    }
    else if (finalId !== oldId) {
        // Сноска СТАРАЯ: обновляем ТОЛЬКО href ссылки в тексте, не трогая её текст
        const oldHref = `#${oldId}`;
        const newHref = `#${finalId}`;

        editor.state.doc.descendants((node, pos) => {
            const link = node.marks.find(m => m.type.name === 'link' && m.attrs.href === oldHref);
            if (link) {
                editor.chain()
                    .setTextSelection({ from: pos, to: pos + node.nodeSize })
                    .extendMarkRange('link')
                    .setMark('link', { ...link.attrs, href: newHref })
                    .run();
                return false;
            }
            return true;
        });
    }

    // 3. ОБНОВЛЕНИЕ ХРАНИЛИЩА ССЫЛОК (Без принудительной смены текста в fb2Title)
    setFootnotes(prev => {
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
}, [activeNote, editor, footnotes]);


// Добавить ссылку
const addFootnote = () => {
    if (!editor || !editor.isActive('paragraph')) return;

    const { from } = editor.state.selection;
    const coords = editor.view.coordsAtPos(from);

    // Генерируем ID
    const newNoteId = `n_${Date.now().toString(36).slice(-4)}`;

    // Формируем шаблон с текущим ID
    const initialContent = [
        {
            type: "fb2Title",
            content: [{ type: "paragraph", content: [{ type: "text", "text": `${newNoteId.substring(2)}` }] }]
        },
        {
            type: "paragraph", content: [{ type: "text", "text": "Новая сноска" }]
        }
    ];


    // Сохраняем в стейт под временным ID
    setFootnotes(prev => ({ ...prev, [newNoteId]: initialContent }));

    setActiveNote({
        id: newNoteId,
        x: coords.left,
        y: coords.top,
        isNew: true,
        pos: from
    });
};

// уДАЛИТЬ ССЫЛКУ
const deleteFootnote = useCallback((id: string) => {
    if (!editor) return;

    // 1. Находим и удаляем все ссылки на этот ID в тексте книги
    const targetHref = `#${id}`;
    editor.state.doc.descendants((node, pos) => {
        const linkMark = node.marks.find(m => m.type.name === 'link' && m.attrs.href === targetHref);
        if (linkMark) {
            // Удаляем текст ссылки (например, "[n123]")
            editor.commands.deleteRange({ from: pos, to: pos + node.nodeSize });
        }
        return true;
    });

    // 2. Удаляем контент сноски из хранилища
    setFootnotes(prev => {
        const updated = { ...prev };
        delete updated[id];
        footnotesRef.current = updated;
        return updated;
    });

    // 3. Закрываем окно
    setActiveNote(null);
}, [editor]);

// Удалить ссылки без упоминаний в тексте
const cleanupOrphanNotes = useCallback(() => {
    if (!editor) return footnotes;

    // 1. Собираем все уникальные ID сносок, на которые есть ссылки в тексте
    const usedIds = new Set<string>();

    editor.state.doc.descendants((node) => {
        const linkMark = node.marks.find(m => m.type.name === 'link' && m.attrs.rel === 'footnote');
        if (linkMark) {
            // Убираем решетку из href (#n123 -> n123)
            const id = linkMark.attrs.href?.replace('#', '');
            if (id) usedIds.add(id);
        }
        return true;
    });

    // 2. Создаем новый объект только с теми сносками, которые используются
    const cleanedFootnotes: Record<string, any> = {};
    let removedCount = 0;

    Object.keys(footnotes).forEach(id => {
        if (usedIds.has(id)) {
            cleanedFootnotes[id] = footnotes[id];
        } else {
            removedCount++;
            console.log(`Удалена неиспользуемая сноска: ${id}`);
        }
    });

    if (removedCount > 0) {
        setFootnotes(cleanedFootnotes);
        footnotesRef.current = cleanedFootnotes;
        // Можно вывести уведомление: toast.success(`Очищено сносок: ${removedCount}`);
    }

    return cleanedFootnotes;
}, [editor, footnotes]);

// Функции-обертки для отправки команд в C#
const openFile = useCallback(() => {
    // Добавляем проверку, чтобы не открывать окно выбора файла дважды
    if (isLoading) return;

    photino.send('open-file', { action: 'select_new' });
}, [isLoading]);

// Save fb2
const saveFile = useCallback(() => {
    if (!editor || isLoading) return;
    if (!editor) return;
    const actualFootnotes = cleanupOrphanNotes();
    const fb2Data = {
        content: editor?.getJSON(),
        footnotes: actualFootnotes,
        metadata: metadata
    };
    photino.send('save-file', fb2Data);
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
    updateNoteText: updateNoteContent,
    footnotesRef, // Передаем реф для использования в editorProps
    openFile,
    saveFile,
    addFootnote,
    deleteFootnote,
    meta: metadata,
};
};
