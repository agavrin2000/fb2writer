import React from 'react';
import { Image, ImageDown, PanelTop, ChevronDown } from 'lucide-react';


export const ImageDropdown: React.FC<{ 
  onSelect: (type: 'block' | 'inline' | 'section') => void 
}> = ({ onSelect }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Закрытие при клике вне меню
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const items = [
    { id: 'block' as const, label: 'Блочное фото', icon: Image, desc: 'Между абзацами' },
    { id: 'inline' as const, label: 'В тексте', icon: ImageDown, desc: 'Внутри строки' },
    { id: 'section' as const, label: 'В заголовок секции', icon: PanelTop, desc: 'Виньетка главы' },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 px-2 rounded text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200 flex items-center gap-1"
        title="Вставить изображение"
      >
        <Image size={20} />
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white border rounded-md shadow-lg z-30 py-1 overflow-hidden">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item.id);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 text-left transition-colors"
            >
              <item.icon size={18} className="text-indigo-600" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-700">{item.label}</span>
                <span className="text-[10px] text-gray-400">{item.desc}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
