import { ChevronDown } from "lucide-react";
import { useEffect, useRef } from "react";

interface FieldProps {
  label: string;
  defaultValue?: string;
  icon?: React.ElementType;
  type?: string;
  onChange?: (val: string) => void;
  onBlur?: (val: string) => void; // 
  isEditable?: boolean;
  className?: string;
  options?: { value: string; label: string }[];
  multiline?: boolean; // Добавляем флаг многострочности
  required?: boolean;
  rows?: number; // Количество строк
  error?: string;   // Текст ошибки  
  touched?: boolean; // Было ли взаимодействие с полем
  action?: {
    icon: React.ElementType;
    onClick: () => void;
    title?: string;
  };
}

export const Field = ({
  label,
  defaultValue,
  type = "text",
  icon: Icon,
  onChange,
  onBlur,
  isEditable = true,
  className,
  options,
  multiline,
  required = false,
  error,
  touched,
  rows = 3,
  action,
}: FieldProps) => {
  const fieldId = `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  // Универсальный реф для всех типов элементов
  // 1. Создаем универсальный тип для рефа
  type FormElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

  // ... внутри компонента ...

  // 2. Указываем тип в useRef
  const inputRef = useRef<FormElement>(null);

  // 3. Используем типизированный Callback Ref без any
  const setRef = (el: FormElement | null) => {
    // Используем type assertion к базовому RefObject, если линтер все еще ругается,
    // но обычно в React 19 достаточно прямого присвоения, если типы в useRef верны.
    (inputRef as React.MutableRefObject<FormElement | null>).current = el;
  };


useEffect(() => {
  if (inputRef.current) {
    // Если значение в инпуте отличается от того, что пришло сверху (Undo/Redo)
    // и при этом инпут сейчас НЕ в фокусе (чтобы не перебивать ввод пользователя)
    // или если это целенаправленный откат версии
    if (inputRef.current.value !== defaultValue) {
      inputRef.current.value = defaultValue || "";
    }
  }
}, [defaultValue]); 

  // Показываем ошибку только если она есть и поле было "тронуто"
  const showError = !!(error && touched);
  // Добавляем отступ справа, если есть кнопка (pr-8), чтобы текст не заезжал под неё
  const baseInputStyles = `w-full text-[12px] py-1.5 
    ${Icon ? "pl-8" : "px-2"} 
    ${action ? "pr-8" : "pr-2"} bg-gray-50 border border-gray-100 rounded focus:bg-white focus:ring-1 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-gray-700 
    ${showError
      ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-100 bg-red-50/30"
      : "border-gray-100 focus:bg-white focus:ring-1 focus:ring-blue-100 focus:border-blue-400"
    } 
    ${required && !defaultValue ? "border-l-2 border-l-amber-400" : ""}`;

  // Базовые стили для input, select и textarea
  //  const baseInputStyles = `w-full text-[12px] py-1.5 ${Icon ? "pl-8" : "px-2"} pr-2 bg-gray-50 border border-gray-100 rounded focus:bg-white focus:ring-1 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-gray-700`;

  return (
    <div className={`mb-3 last:mb-0 ${className}`}>
      <label
        htmlFor={fieldId}
        className="block text-[9px] font-bold text-gray-400 uppercase mb-1 ml-0.5 tracking-wider"
      >
        {label}
        {required && (
          <span className="ml-1 text-red-500 font-bold" title="Обязательное поле">*</span>
        )}
      </label>
      <div className="relative group">
        {/* Иконка: центрируем для одной строки или прижимаем к верху для многострочного текста */}
        {Icon && (
          <Icon
            size={12}
            className={`absolute left-2.5 ${multiline ? "top-3" : "top-1/2 -translate-y-1/2"} 
            ${showError ? "text-red-400" : "text-gray-300 group-focus-within:text-blue-500"} 
            transition-colors pointer-events-none z-10`}
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
            ref={setRef}
            defaultValue={defaultValue || ""}
            disabled={!isEditable}
            required={required}
            onChange={(e) => onChange?.(e.target.value)}
            onBlur={(e) => onBlur?.(e.target.value)}
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
            ref={setRef}
            defaultValue={defaultValue || ""}
            rows={rows}
            required={required}
            readOnly={!isEditable}
            onChange={(e) => onChange?.(e.target.value)}
            onBlur={(e) => onBlur?.(e.target.value)}
            className={`${baseInputStyles} resize-none`}
          />
        ) : (
          <input
            id={fieldId}
            ref={setRef}
            type={type}
            defaultValue={defaultValue || ""}
            readOnly={!isEditable}
            required={required}
            onChange={(e) => onChange?.(e.target.value)}
            onBlur={(e) => onBlur?.(e.target.value)}
            className={baseInputStyles}
          />
        )}

        {/* Иконка селекта */}
        {options && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <ChevronDown size={12} />
          </div>
        )}
      </div>

      {/* Вывод ошибки */}
      <div className={`overflow-hidden transition-all duration-200 ${showError ? "max-h-10 mt-1" : "max-h-0"}`}>
        <p className="text-[10px] text-red-500 ml-0.5 font-medium leading-tight">
          {error}
        </p>
      </div>
    </div>
  );
};
