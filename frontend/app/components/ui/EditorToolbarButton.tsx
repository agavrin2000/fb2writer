interface EditorToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
}

/**
 * Кнопка тулбара форматирования текста.
 * Отображает иконку и изменяет стиль в зависимости от состояния (активна/неактивна/недоступна).
 * 
 * @param onClick - Обработчик клика.
 * @param active - Флаг активности кнопки (например, выделен ли текст жирным).
 * @param disabled - Флаг недоступности (например, если команда не может быть применена).
 * @param icon - Иконка кнопки (React-элемент).
 */
export const EditorToolbarButton = ({ onClick, active, disabled, icon }: EditorToolbarButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`p-1.5 rounded transition-colors ${active
      ? 'bg-blue-100 text-blue-600'
      : disabled
        ? 'opacity-25 cursor-default grayscale text-gray-300' // Сделали чуть прозрачнее
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
      }`}
  >
    {icon}
  </button>
);