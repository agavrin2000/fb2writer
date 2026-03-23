import { BubbleMenu } from '@tiptap/react/menus';
import React from 'react';
import { Editor } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { X, Download } from 'lucide-react';

interface ImageBubbleMenuProps {
  editor: Editor | null;
}

export const ImageBubbleMenu: React.FC<ImageBubbleMenuProps> = ({ editor }) => {
  const [info, setInfo] = React.useState<{ size: string, w: number, h: number, src: string } | null>(null);

  React.useEffect(() => {
    if (!editor) return;

    const updateInfo = () => {
      const { selection } = editor.state;
      if (selection instanceof NodeSelection) {
        const typeName = selection.node.type.name;
        if (typeName === 'fb2InlineImage' || typeName === 'fb2BlockImage') {
          const src = selection.node.attrs.src || '';
          const dom = editor.view.nodeDOM(selection.from) as HTMLElement;
          const img = dom instanceof HTMLImageElement ? dom : dom?.querySelector('img');

          setInfo({
            src,
            size: src.startsWith('data:') ? (src.length * 0.75 / 1024).toFixed(1) + ' Кб' : 'URL',
            w: img?.naturalWidth || 0,
            h: img?.naturalHeight || 0
          });
        } else {
          setInfo(null);
        }
      } else {
        setInfo(null);
      }
    };

    editor.on('selectionUpdate', updateInfo);
    return () => { editor.off('selectionUpdate', updateInfo); };
  }, [editor]);

  const handleDownload = () => {
    if (!info?.src) return;
    const link = document.createElement('a');
    link.href = info.src;
    link.download = `image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor }) => editor.isActive('fb2InlineImage') || editor.isActive('fb2BlockImage')}
      updateDelay={0}
      // Прижимаем всё меню к правому верхнему углу картинки
      options={{ placement: 'top', offset: true, flip: true }}
    >
      {/* Контейнер-обертка, который будет иметь ту же ширину, что и выделенная картинка */}
      <div className="flex bg-white border border-gray-200 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Плашка с информацией */}
        {info && (
          <div className="px-3 py-1.5 bg-slate-50 border-b border-gray-100 flex items-center gap-3 text-[10px] font-bold text-slate-500 whitespace-nowrap">
            <span className="flex items-center gap-1">
              {info.w} × {info.h} px
            </span>
            <span className="w-px h-3 bg-slate-200" />
            <span className="flex items-center gap-1">
              <span className="text-blue-500">SIZE:</span> {info.size}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={handleDownload}
          className="p-1.5 hover:bg-slate-100 text-slate-600 border-r border-gray-100 transition-colors"
          title="Скачать"
        >
          <Download size={15} />
        </button>
        <button type="button" title="Удалить изображение"
          onClick={() => editor.chain().focus().deleteSelection().run()}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </BubbleMenu >
  );
};
