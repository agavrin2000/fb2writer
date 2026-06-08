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
/**
 * Интерфейс свойств компонента RichTextEditor.
 */
interface RichTextProps {
    /**
     * Начальное содержимое редактора в формате JSON Tiptap.
     * Если `null`, редактор инициализируется пустым документом.
     */
    content: JSONContent | null;

    /**
     * Обработчик изменения содержимого.
     * Вызывается при каждом изменении в редакторе с передачей текущего состояния в формате JSON.
     *
     * @param json - Текущее содержимое редактора в формате JSON Tiptap.
     */
    onChange: (json: JSONContent | undefined) => void;
}

/**
 * Компонент текстового редактора с поддержкой форматирования для использования во всплывающих окнах метаданных.
 *
 * Предоставляет интерфейс для:
 * - Редактирования текста с базовым форматированием (жирный, курсив, зачеркнутый, верхний/нижний индекс, цитата).
 * - Вставки и управления таблицами (добавление/удаление строк, столбцов, объединение ячеек и т.д.).
 * - Добавления специального элемента "подзаголовок" (fb2Subtitle).
 *
 * Использует библиотеку Tiptap с расширениями StarterKit, Superscript, Subscript и кастомными расширениями FB2.
 * Содержимое автоматически синхронизируется через колбэк `onChange`.
 *
 * @param content - Начальное содержимое редактора.
 * @param onChange - Функция обратного вызова для обновления родительского компонента.
 * @returns React-компонент редактора или `null`, если редактор не инициализирован.
 *
 * @example
 * ```tsx
 * <RichTextEditor
 *   content={initialContent}
 *   onChange={(json) => handleContentChange(json)}
 * />
 * ```
 */
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
        enableInputRules: false,
        enablePasteRules: false,

        content: null,
        immediatelyRender: false,

        onUpdate: ({ editor }) => {
            // Если редактор пустой, отправляем null
            const outputContent = editor.isEmpty ? undefined : editor.getJSON();
            onChange(outputContent);
        },
        editorProps: {
            attributes: {
                // Добавляем стили для blockquote через Tailwind классы
                class: 'note-popup-editor prose-sm focus:outline-none min-h-[120px] p-3 text-[13px] bg-ui-bg text-ui-text [&_blockquote]:border-l-4 [&_blockquote]:border-gray-200 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-2',
            },
        },
        onSelectionUpdate: forceUpdate
    });

    /**
     * Обрабатывает выбор действия в выпадающем меню таблицы.
     * Выполняет соответствующую команду редактора в зависимости от типа выбранного действия.
     *
     * @param type - Тип действия (например, "addTable", "removeColumn", "alignCenter" и т.д.).
     */
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

    /**
         * Синхронизирует содержимое редактора с внешним пропсом `content` при его изменении.
         * Используется для принудительного обновления редактора, когда данные приходят извне.
         */
    useEffect(() => {
        if (editor) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    if (!editor) return null;

    return (
        <div className="mb-4">
            <div className="border border-ui-border rounded-lg bg-ui-bg overflow-hidden focus-within:border-[var(--color-ui-accent)] focus-within:ring-1 focus-within:ring-[var(--color-ui-accent)]/20 transition-all">
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
                <div className="flex items-center gap-1 p-1 bg-paper-bg border-b border-ui-border/50">
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
                <div className="text-paper-text">
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    );

};

RichTextEditor.displayName = "RichTextEditor";

