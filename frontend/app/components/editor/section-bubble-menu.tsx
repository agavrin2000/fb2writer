import { BubbleMenu } from '@tiptap/react/menus';
import { PlusSquare, Trash2, Heading } from 'lucide-react'
import { Editor } from '@tiptap/react';

interface SectionBubbleMenuProps {
    editor: Editor | null;
}
export const SectionBubbleMenu: React.FC<SectionBubbleMenuProps> = ({ editor }) => {
    if (!editor) return null

    return (
        <BubbleMenu
            editor={editor}
            // Меню появится, если выделен текст внутри секции или заголовка
  shouldShow={({ editor, from, to }) => {
    // Не показывать, если выделена картинка
    if (editor.isActive('image')) return false;

    // Показывать, только если выделен текст внутри секции/заголовка 
    // ИЛИ если выделение не пустое (от текста зависит)
    return editor.isActive('fb2Section') || editor.isActive('fb2Title');
  }}        >
            <div className="flex items-center bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden p-1 gap-1">

                {/* Создать подсекцию */}
                <button
                    onClick={() => editor.chain().focus().insertContent({
                        type: 'fb2Section',
                        content: [{ type: 'fb2Title', content: [{ type: 'paragraph', text: 'Новая глава' }] }]
                    }).run()}
                    className="p-2 hover:bg-blue-50 text-blue-600 rounded transition-colors"
                    title="Добавить подсекцию"
                >
                    <PlusSquare size={16} />
                </button>

                <div className="w-px h-4 bg-gray-200 mx-1" />

                {/* Удалить текущую секцию целиком */}
                <button
                    onClick={() => {
                        if (confirm('Удалить всю главу целиком?')) {
                            editor.chain().focus().deleteNode('fb2Section').run()
                        }
                    }}
                    className="p-2 hover:bg-red-50 text-red-600 rounded transition-colors"
                    title="Удалить секцию"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </BubbleMenu>
    )
}