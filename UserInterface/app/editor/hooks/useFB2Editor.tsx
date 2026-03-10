'use client';

import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Fb2Metadata, IPhotinoBridge, TocItem } from '../../types/types';

export const useFB2Editor = () => {
    const [metadata, setMetadata] = useState<Fb2Metadata>({ Title: '', Author: '' });
    const [tocTree, setTocTree] = useState<TocItem[]>([]);
    const [activeHeadingPos, setActiveHeadingPos] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeNote, setActiveNote] = useState<{ id: string; text: string; x: number; y: number } | null>(null);
    const [footnotes, setFootnotes] = useState<Record<string, string>>({});
    const footnotesRef = useRef<Record<string, string>>({});

    const getPhotino = () => (typeof window !== 'undefined' ? (window.external as any) as IPhotinoBridge : null);

    const buildTree = (nodes: { pos: number, text: string, level: number }[]) => {
        const root: TocItem[] = [];
        const stack: TocItem[] = [];
        nodes.forEach(node => {
            const currentLevel = node.level > 0 ? node.level : 1;
            const item: TocItem = { ...node, level: currentLevel, children: [] };
            while (stack.length > 0 && stack[stack.length - 1].level >= currentLevel) stack.pop();
            if (stack.length === 0) root.push(item);
            else stack[stack.length - 1].children.push(item);
            stack.push(item);
        });
        return root;
    };

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { class: 'fb2-note-link text-blue-600 underline cursor-pointer', 'data-type': 'note' },
            }),
            Image.configure({ inline: false, allowBase64: true, HTMLAttributes: { class: 'mx-auto rounded-lg shadow-md my-4' } }),
        ],
        editorProps: {
            handleClick: (view, pos, event) => {
                const { schema } = view.state;
                const node = view.state.doc.nodeAt(pos);
                const mark = node?.marks.find(m => m.type === schema.marks.link);
                if (mark) {
                    const noteId = mark.attrs.href.replace('#', '');
                    const noteContent = footnotesRef.current[noteId]; 
                    if (noteContent !== undefined) {
                        setActiveNote({ id: noteId, text: noteContent, x: event.clientX, y: event.clientY });
                        return true;
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
        },
    });

    const handleSave = useCallback(() => {
        if (!editor) return;
        getPhotino()?.sendMessage('save-file:' + JSON.stringify({ Meta: metadata, EditorContent: editor.getJSON() }));
    }, [editor, metadata]);

    return { 
        editor, 
        metadata, 
        setMetadata, 
        tocTree, 
        activeHeadingPos, 
        setActiveHeadingPos,
        isLoading, 
        setIsLoading,
        activeNote, 
        setActiveNote,
        handleSave,
        getPhotino
    };
};
