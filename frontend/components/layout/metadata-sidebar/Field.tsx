import { ChevronDown } from "lucide-react";
import { memo, useEffect, useId, useImperativeHandle, useRef } from "react";

interface FieldProps {
  label: string;
  defaultValue?: string;
  icon?: React.ElementType;
  type?: string;
  onChange?: (val: string) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
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
  ref?: React.Ref<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
}

export const FieldComponent = ({
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
  ref
}: FieldProps) => {
  const generatedId = useId();
  const fieldId = `field-${generatedId}`;
  const errorId = `${fieldId}-error`;
  const hasAction = action && !options
  type FormElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

  // Внутренний реф для управления DOM-узлом (синхронизация, фокус)
  const internalRef = useRef<FormElement>(null);

  // Передаем внутренний узел во внешний ref, предоставленный родителем
  useImperativeHandle(ref, () => internalRef.current as FormElement, []);

  // Синхронизация неконтролируемого значения при изменении извне (Undo/Redo)
  useEffect(() => {
    if (internalRef.current && internalRef.current.value !== (defaultValue ?? "")) {
      internalRef.current.value = defaultValue ?? "";
    }
  }, [defaultValue]);

  // Показываем ошибку только если она есть и поле было "тронуто"
  const showError = !!(error && touched);

  // Базовые стили для input, select и textarea
  const baseInputStyles = `
  w-full text-[12px] py-1.5 transition-all outline-none rounded border
  ${Icon ? "pl-8" : "px-2"} 
  ${hasAction ? "pr-8" : "pr-2"} 
  text-gray-700
  ${!isEditable ? "bg-gray-100 cursor-not-allowed opacity-75" : "bg-gray-50 focus:bg-white focus:ring-1"}
  ${showError
      ? "border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/30"
      : "border-gray-100 focus:border-blue-400 focus:ring-blue-100"
    }
  ${required && !defaultValue && isEditable ? "border-l-2 border-l-amber-400" : ""}
`.replace(/\s+/g, ' ').trim();

  // Общие свойства
  const commonProps = {
    id: fieldId,
    defaultValue: defaultValue || "",
    required: required,
    tabIndex: isEditable ? undefined : -1,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange?.(e.target.value),
    onBlur: onBlur,
    "aria-invalid": showError,
    "aria-describedby": showError ? errorId : undefined,
  };

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
        {hasAction && (
          <button
            type="button"
            onClick={action.onClick}
            title={action.title}
            disabled={!isEditable}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-blue-500 hover:bg-blue-50 disabled:pointer-events-none rounded transition-all z-20"
          >
            <action.icon size={14} />
          </button>
        )}
        {options ? (
          <div className="relative">
            <select
              {...commonProps}
              ref={internalRef as React.Ref<HTMLSelectElement>}
              className={`${baseInputStyles} pr-8 appearance-none cursor-pointer`}
            >
              <option value="" disabled>Выбрать...</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <ChevronDown size={12} />
            </div>
          </div>
        ) : multiline ? (
          <textarea
            {...commonProps}
            ref={internalRef as React.Ref<HTMLTextAreaElement>}
            readOnly={!isEditable}
            rows={rows}
            className={`${baseInputStyles} resize-none block`}
          />
        ) : (
          <input
            {...commonProps}
            ref={internalRef as React.Ref<HTMLInputElement>}
            type={type}
            readOnly={!isEditable}
            className={baseInputStyles}
          />
        )}
      </div>

      {/* Ошибка с aria-live для скринридеров */}
      <div
        id={errorId}
        aria-live="polite"
        className={`overflow-hidden transition-all duration-200 ${showError ? "max-h-20 mt-1" : "max-h-0"}`}
      >
        <p className="text-[10px] text-red-500 ml-0.5 font-medium leading-tight">
          {error}
        </p>
      </div>
    </div>
  );
};

export const Field = memo(FieldComponent);