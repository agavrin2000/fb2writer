import React from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  word: string;
  suggestions: string[];
  onReplace: (replacement: string) => void;
  onAddException: (word: string) => void;
  onClose: () => void;
}

export const SpellcheckContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  word,
  suggestions,
  onReplace,
  onAddException,
  onClose,
}) => {
  // Закрываем меню при клике по фону страницы
  React.useEffect(() => {
    document.addEventListener('click', onClose);
    return () => document.removeEventListener('click', onClose);
  }, [onClose]);

  return (
    <div
      className="fixed z-50 min-w-[200px] bg-ui-bg text-ui-text border border-gray-200 rounded-lg shadow-xl p-1 text-sm font-sans"
      style={{ top: `${y}px`, left: `${x}px` }}
      onClick={(e) => e.stopPropagation()} // предотвращаем закрытие при клике внутри меню
    >
      {/* Секция вариантов исправления */}
      <div className="px-3 py-1.5 text-xs text-gray-400 font-semibold border-b border-gray-100">
        Варианты для «{word}»
      </div>
      
      <div className="max-h-[200px] overflow-y-auto py-1">
        {suggestions.length > 0 ? (
          suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onReplace(suggestion)}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-500 hover:text-white rounded transition-colors duration-150"
            >
              {suggestion}
            </button>
          ))
        ) : (
          <div className="px-3 py-1.5 text-gray-400 italic">Нет вариантов</div>
        )}
      </div>

      {/* Управляющие действия для оцифровщиков */}
      <div className="border-t border-gray-100 mt-1 pt-1">
        <button
          onClick={() => onAddException(word)}
          className="w-full text-left px-3 py-1.5 text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors duration-150 font-medium"
        >
          ➕ Добавить в исключения
        </button>
      </div>
    </div>
  );
};
