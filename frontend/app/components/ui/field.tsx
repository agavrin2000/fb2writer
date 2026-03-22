import { ChevronDown } from "lucide-react";

interface FieldProps {
  label: string;
  value?: string;
  icon?: any;
  type?: string;
  onChange?: (val: string) => void;
  isEditable?: boolean;
  className?: string;
  options?: { value: string; label: string }[];
  multiline?: boolean; // Добавляем флаг многострочности
  rows?: number; // Количество строк
  action?: {
    icon: any;
    onClick: () => void;
    title?: string;
  };
}

export const Field = ({
  label,
  value,
  type = "text",
  icon: Icon,
  onChange,
  isEditable = true,
  className,
  options,
  multiline,
  rows = 3,
  action,
}: FieldProps) => {
  const fieldId = `field-${label.replace(/\s+/g, "-").toLowerCase()}`;

  // Добавляем отступ справа, если есть кнопка (pr-8), чтобы текст не заезжал под неё
  const baseInputStyles = `w-full text-[12px] py-1.5 ${Icon ? "pl-8" : "px-2"} ${action ? "pr-8" : "pr-2"} bg-gray-50 border border-gray-100 rounded focus:bg-white focus:ring-1 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-gray-700`;

  // Базовые стили для input, select и textarea
  //  const baseInputStyles = `w-full text-[12px] py-1.5 ${Icon ? "pl-8" : "px-2"} pr-2 bg-gray-50 border border-gray-100 rounded focus:bg-white focus:ring-1 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-gray-700`;

  return (
    <div className={`mb-3 last:mb-0 ${className}`}>
      <label
        htmlFor={fieldId}
        className="block text-[9px] font-bold text-gray-400 uppercase mb-1 ml-0.5 tracking-wider"
      >
        {label}
      </label>
      <div className="relative group">
        {/* Иконка: центрируем для одной строки или прижимаем к верху для многострочного текста */}
        {Icon && (
          <Icon
            size={12}
            className={`absolute left-2.5 ${multiline ? "top-3" : "top-1/2 -translate-y-1/2"} text-gray-300 group-focus-within:text-blue-500 transition-colors pointer-events-none z-10`}
          />
        )}
        {/* Вставляем кнопку действия, если она передана */}
        {action && !options && !multiline && (
          <button
            type="button"
            onClick={action.onClick}
            title={action.title}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded transition-all z-20"
          >
            <action.icon size={14} />
          </button>
        )}
        {options ? (
          <select
            id={fieldId}
            value={value || ""}
            disabled={!isEditable}
            onChange={(e) => onChange?.(e.target.value)}
            className={`${baseInputStyles} pr-8 appearance-none cursor-pointer`}
          >
            <option value="" disabled>
              Выбрать...
            </option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : multiline ? (
          <textarea
            id={fieldId}
            value={value || ""}
            rows={rows}
            readOnly={!isEditable}
            onChange={(e) => onChange?.(e.target.value)}
            className={`${baseInputStyles} resize-none`}
          />
        ) : (
          <input
            id={fieldId}
            type={type}
            value={value || ""}
            readOnly={!isEditable}
            onChange={(e) => onChange?.(e.target.value)}
            className={baseInputStyles}
          />
        )}

        {options && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <ChevronDown size={12} />
          </div>
        )}
      </div>
    </div>
  );
};
