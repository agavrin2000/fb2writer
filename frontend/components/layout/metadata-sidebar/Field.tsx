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
  
  /* Цвета текста и границ из темы */
  text-[var(--color-ui-text)]
  border-[var(--color-ui-border)]
  
  /* Состояния редактирования */
  ${!isEditable
      ? "bg-[var(--color-ui-bg-hover)] cursor-not-allowed opacity-60"
      : "bg-[var(--color-ui-bg)] focus:bg-[var(--color-paper-bg)] focus:ring-1 focus:ring-[var(--color-ui-accent)]/30"
    }
  
  /* Состояния ошибки и валидации */
  ${showError
      ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20 bg-red-500/5"
      : "focus:border-[var(--color-ui-accent)]"
    }
  
  /* Индикатор обязательного поля через border-l */
  ${required && !defaultValue && isEditable
      ? "border-l-2 border-l-amber-500"
      : ""
    }
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
        /* Используем ui-text-muted для меток */
        className="block text-[9px] font-bold text-[var(--color-ui-text-muted)] uppercase mb-1 ml-0.5 tracking-wider"
      >
        {label}
        {required && (
          <span className="ml-1 text-red-500 font-bold" title="Обязательное поле">*</span>
        )}
      </label>

      <div className="relative group">
        {/* Иконка: меняет цвет на акцентный при фокусе на поле */}
        {Icon && (
          <Icon
            size={12}
            className={`absolute left-2.5 ${multiline ? "top-3" : "top-1/2 -translate-y-1/2"} 
          ${showError ? "text-red-400" : "text-[var(--color-ui-text-muted)] opacity-50 group-focus-within:text-[var(--color-ui-accent)] group-focus-within:opacity-100"} 
          transition-colors pointer-events-none z-10`}
          />
        )}

        {/* Кнопка действия */}
        {hasAction && (
          <button
            type="button"
            onClick={action.onClick}
            title={action.title}
            disabled={!isEditable}
            /* Используем ui-bg-hover для фона при наведении */
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-[var(--color-ui-text-muted)] hover:text-[var(--color-ui-accent)] hover:bg-[var(--color-ui-bg-hover)] disabled:pointer-events-none rounded transition-all z-20"
          >
            <action.icon size={14} />
          </button>
        )}

        {options ? (
          <div className="relative">
            <select
              {...commonProps}
              ref={internalRef as React.Ref<HTMLSelectElement>}
              /* Важно: добавь в baseInputStyles цвета bg-[var(--color-ui-bg)] и border-[var(--color-ui-border)] */
              className={`${baseInputStyles} pr-8 appearance-none cursor-pointer bg-[var(--color-ui-bg)] text-[var(--color-ui-text)] border-[var(--color-ui-border)] focus:border-[var(--color-ui-accent)]`}
            >
              <option value="" disabled className="bg-[var(--color-ui-bg)]">Выбрать...</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[var(--color-ui-bg)]">{opt.label}</option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-ui-text-muted)]">
              <ChevronDown size={12} />
            </div>
          </div>
        ) : multiline ? (
          <textarea
            {...commonProps}
            ref={internalRef as React.Ref<HTMLTextAreaElement>}
            readOnly={!isEditable}
            rows={rows}
            className={`${baseInputStyles} resize-none block bg-[var(--color-ui-bg)] text-[var(--color-ui-text)] border-[var(--color-ui-border)] focus:border-[var(--color-ui-accent)] placeholder:text-[var(--color-ui-text-muted)]/40`}
          />
        ) : (
          <input
            {...commonProps}
            ref={internalRef as React.Ref<HTMLInputElement>}
            type={type}
            readOnly={!isEditable}
            className={`${baseInputStyles} bg-[var(--color-ui-bg)] text-[var(--color-ui-text)] border-[var(--color-ui-border)] focus:border-[var(--color-ui-accent)] placeholder:text-[var(--color-ui-text-muted)]/40`}
          />
        )}
      </div>

      {/* Ошибка */}
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