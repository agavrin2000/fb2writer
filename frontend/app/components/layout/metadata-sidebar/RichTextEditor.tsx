import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Quote, Strikethrough, Superscript as SuperscriptIcon, Subscript as SubscriptIcon, } from 'lucide-react';
import React from 'react';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { Fb2Subtitle } from '../../editor/extensions/fb2subtitle';

interface RichTextProps {
    content: any; // TipTap JSON
    onChange: (json: any) => void;
}

export const RichTextEditor = ({ content, onChange }: RichTextProps) => {
        const safeContent = React.useMemo(() => {
        if (!content) return { type: 'doc', content: [] };
        if (Array.isArray(content)) return { type: 'doc', content: content };
        return content;
    }, [content]);
    const editor = useEditor({
        extensions: [StarterKit,
            Superscript, // Без .configure(), если используешь дефолтный импорт
            Subscript,
            Fb2Subtitle
        ],
        content: safeContent,
        immediatelyRender: false,
        onUpdate: ({ editor }) => onChange(editor.getJSON()),
        editorProps: {
            attributes: {
                // Добавляем стили для blockquote через Tailwind классы
                class: 'annotation-editor prose-sm focus:outline-none min-h-[120px] p-3 text-[13px] bg-white text-gray-700 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-200 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-2',
            },
        },
    });

    React.useEffect(() => {
        if (editor && content && editor.isEmpty) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    if (!editor) return null;

    return (
        <div className="mb-4">
            <div className="border border-gray-100 rounded-lg bg-gray-50 overflow-hidden focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100 transition-all">
                {/* Панель инструментов */}
                <div className="flex items-center gap-1 p-1 bg-white border-b border-gray-100">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        active={editor.isActive('bold')} icon={<Bold size={14} />}
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        active={editor.isActive('italic')} icon={<Italic size={14} />}
                    />

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        active={editor.isActive('strike')} icon={<Strikethrough size={14} />}
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleSuperscript().run()}
                        active={editor.isActive('superscript')} icon={<SuperscriptIcon size={14} />}
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleSubscript().run()}
                        active={editor.isActive('subscript')} icon={<SubscriptIcon size={14} />}
                    />

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        active={editor.isActive('blockquote')}
                        icon={<Quote size={14} />}
                        title="Цитата"
                    />
                </div>

                {/* Область редактирования */}
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};

const ToolbarButton = ({ onClick, active, icon }: any) => (
    <button
        type="button"
        onClick={onClick}
        className={`p-1.5 rounded transition-colors ${active ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
    >
        {icon}
    </button>
);
