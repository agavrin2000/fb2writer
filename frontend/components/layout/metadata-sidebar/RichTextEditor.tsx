import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Quote, Strikethrough, Superscript as SuperscriptIcon, Subscript as SubscriptIcon, Baseline, } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { Fb2Subtitle } from '../../editor/extensions/fb2subtitle';
import { EditorToolbarButton } from "@/components/ui/EditorToolbarButton"
import { TableDropdown } from "@/components/layout/TableDropdown";
import { Fb2Table, Fb2TableRow, Fb2Td, Fb2Th } from "@/components/editor/extensions/fb2table";
import { Fb2ActionIcon } from "@/components/ui/Fb2ActionIcon";

interface RichTextProps {
    content: JSONContent | null; // TipTap JSON
    onChange: (json: JSONContent) => void;
}

export const RichTextEditor = ({ content, onChange }: RichTextProps) => {
    const [, setUpdateTick] = useState(0);
    const forceUpdate = useCallback(() => setUpdateTick(tick => tick + 1), []);

    const editor = useEditor({
        extensions: [StarterKit.configure({
            gapcursor: false,
        }),
            Superscript,
            Subscript,
            Fb2Subtitle,
            Fb2Table,
            Fb2TableRow,
            Fb2Td,
            Fb2Th,
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
        onSelectionUpdate: forceUpdate
    });
    const handleTableSelect = (type: string) => {
        if (!editor) return;

        switch (type) {
            case "addTable":
                // Создаем таблицу 3x3 (fb2-совместимую)
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                break;
            case "removeTable":
                editor.chain().focus().deleteTable().run();
                break;
            case "addColumn":
                editor.chain().focus().addColumnAfter().run();
                break;
            case "removeColumn":
                editor.chain().focus().deleteColumn().run();
                break;
            case "addRow":
                editor.chain().focus().addRowAfter().run();
                break;
            case "removeRow":
                editor.chain().focus().deleteRow().run();
                break;
            case "mergeCells":
                editor.chain().focus().mergeCells().run();
                break;
            case "splitCell":
                editor.chain().focus().splitCell().run();
                break;
            case "alignLeft":
                editor.chain().focus().setCellAttribute('align', 'left').run();
                break;
            case "alignCenter":
                editor.chain().focus().setCellAttribute('align', 'center').run();
                break;
            case "alignRight":
                editor.chain().focus().setCellAttribute('align', 'right').run();
                break;
            case "valignTop":
                editor.chain().focus().setCellAttribute('valign', 'top').run()
                break;
            case "valignMiddle":
                editor.chain().focus().setCellAttribute('valign', 'middle').run()
                break;
            case "valignBottom":
                editor.chain().focus().setCellAttribute('valign', 'bottom').run()
                break;
        }
    };

    useEffect(() => {
        if (editor) {
            editor.commands.setContent(content ?? { type: 'doc', content: [] });
        }
    }, [content, editor]);

    if (!editor) return null;

    return (
        <div className="mb-4">
            <div className="border border-[var(--color-ui-border)] rounded-lg bg-[var(--color-ui-bg)] overflow-hidden focus-within:border-[var(--color-ui-accent)] focus-within:ring-1 focus-within:ring-[var(--color-ui-accent)]/20 transition-all">
                {/* Панель инструментов */}
                <div className="flex items-center gap-1 py-1 bg-[var(--color-paper-bg)] border-b border-[var(--color-ui-border)]/50">
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
                <div className="flex items-center gap-1 p-1 bg-[var(--color-paper-bg)] border-b border-[var(--color-ui-border)]/50">
                    <TableDropdown
                        onSelect={handleTableSelect}
                        canAddTable={editor.state.selection.$from.parent.type?.name == "paragraph" && editor.can().insertTable()}
                        canRemoveTable={editor.can().deleteTable()}
                        canAddColumn={editor.can().addColumnAfter()}
                        canRemoveColumn={editor.can().deleteColumn()}
                        canAddRow={editor.can().addRowAfter()}
                        canRemoveRow={editor.can().deleteRow()}
                        canMergeCells={editor.can().mergeCells()}
                        canSplitCell={editor.can().splitCell()}
                        canAlign={editor.can().deleteTable()}
                    />
                    <EditorToolbarButton
                        onClick={() =>
                            editor.can().removeFb2Subtitle()
                                ? editor.chain().focus().removeFb2Subtitle().run()
                                : editor.chain().focus().insertFb2Subtitle().run()
                        }
                        disabled={!editor.can().removeFb2Subtitle() && !editor.can().insertFb2Subtitle()}
                        icon={<Fb2ActionIcon size={14}
                            icon={Baseline}
                            mode={editor.can().removeFb2Subtitle() ? "remove" : "add"}
                        />}
                    />
                </div>

                {/* Область редактирования (Tiptap) */}
                <div className="text-[var(--color-paper-text)]">
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    );

};

RichTextEditor.displayName = "RichTextEditor";


