import { cn } from "@/utils/cn";

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
    className={cn("toolbar-btn", active ? "toolbar-btn-active" : "toolbar-btn-default")}
  >
    {icon}
  </button>
);