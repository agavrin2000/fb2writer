import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Quote, Strikethrough, Superscript as SuperscriptIcon, Subscript as SubscriptIcon, } from 'lucide-react';
import { memo, useEffect } from 'react';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { Fb2Subtitle } from '../../editor/extensions/fb2subtitle';
import { EditorToolbarButton } from "@/components/ui/EditorToolbarButton"

interface RichTextProps {
    content: JSONContent | null; // TipTap JSON
    onChange: (json: JSONContent) => void;
}

export const RichTextEditor = memo(({ content, onChange }: RichTextProps) => {

    const editor = useEditor({
        extensions: [StarterKit,
            Superscript,
            Subscript,
            Fb2Subtitle
        ],
        content: content ?? { type: 'doc', content: [] },
        immediatelyRender: false,

        onUpdate: ({ editor }) => onChange(editor.getJSON()),
        editorProps: {
            attributes: {
                // Добавляем стили для blockquote через Tailwind классы
                class: 'note-popup-editor prose-sm focus:outline-none min-h-[120px] p-3 text-[13px] bg-white text-gray-700 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-200 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-2',
            },
        },
    });

    useEffect(() => {
        if (editor && content && editor.isEmpty) {
            editor.commands.setContent(content ?? { type: 'doc', content: [] });
        }
    }, [content, editor]);

    if (!editor) return null;

  return (
    <div className="mb-4">
        <div className="border border-[var(--color-ui-border)] rounded-lg bg-[var(--color-ui-bg)] overflow-hidden focus-within:border-[var(--color-ui-accent)] focus-within:ring-1 focus-within:ring-[var(--color-ui-accent)]/20 transition-all">
            {/* Панель инструментов */}
            <div className="flex items-center gap-1 p-1 bg-[var(--color-paper-bg)] border-b border-[var(--color-ui-border)]/50">
                <EditorToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    active={editor.isActive('bold')}
                    disabled={!editor.can().chain().toggleBold()}
                    icon={<Bold size={14} />}
                />
                <EditorToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    active={editor.isActive('italic')}
                    disabled={!editor.can().chain().toggleItalic()}
                    icon={<Italic size={14} />}
                />
                <EditorToolbarButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    active={editor.isActive('strike')}
                    disabled={!editor.can().chain().toggleStrike()}
                    icon={<Strikethrough size={14} />}
                />
                <EditorToolbarButton
                    onClick={() => editor.chain().focus().toggleSuperscript().run()}
                    active={editor.isActive('superscript')}
                    disabled={!editor.can().chain().toggleSuperscript()}
                    icon={<SuperscriptIcon size={14} />}
                />
                <EditorToolbarButton
                    onClick={() => editor.chain().focus().toggleSubscript().run()}
                    disabled={!editor.can().chain().toggleSubscript()}
                    active={editor.isActive('subscript')}
                    icon={<SubscriptIcon size={14} />}
                />
                <EditorToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    disabled={!editor.can().chain().toggleBlockquote()}
                    active={editor.isActive('blockquote')}
                    icon={<Quote size={14} />}
                />
            </div>

            {/* Область редактирования (Tiptap) */}
            <div className="text-[var(--color-paper-text)]">
                <EditorContent editor={editor} />
            </div>
        </div>
    </div>
);

});

RichTextEditor.displayName = "RichTextEditor";


