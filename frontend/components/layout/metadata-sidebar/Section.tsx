import React, { ReactNode, ElementType } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Интерфейс свойств компонента секции с возможностью сворачивания.
 */
interface SectionProps {
  /**
   * Заголовок секции, отображаемый в шапке.
   */
  title: string;

  /**
   * Иконка, отображаемая слева от заголовка. Ожидается компонент из библиотеки Lucide (например, `Book`, `User`).
   * @optional
   */
  icon?: ElementType;

  /**
   * Содержимое секции, которое будет скрыто/показано при переключении состояния.
   */
  children: ReactNode;

  /**
   * Дополнительные CSS-классы для кастомизации внешнего вида.
   * @default ""
   */
  className?: string;

  /**
   * Определяет, будет ли секция раскрыта по умолчанию.
   * @default true
   */
  defaultOpen?: boolean;
}

/**
 * Компонент сворачиваемой секции, используемый в боковых панелях (например, в редакторе метаданных).
 * Предоставляет интерфейс с кликабельной шапкой, содержащей заголовок и иконку,
 * и контентной областью с анимированным появлением/исчезновением.
 *
 * Особенности:
 * - Поддерживает доступность: `aria-controls`, `aria-expanded`.
 * - Использует `React.useId()` для уникальной привязки кнопки и контента.
 * - Анимация раскрытия/сворачивания с помощью `grid` и `grid-rows-[1fr]/[0fr]`.
 * - Управление состоянием через локальный хук `useState`.
 *
 * @component
 * @param props - Входные параметры компонента {@link SectionProps}.
 *
 * @example
 * <Section title="Автор" icon={User}>
 *   <input type="text" placeholder="Имя автора" />
 * </Section>
 */
export const Section = ({
  title,
  icon: Icon,
  children,
  className = "",
  defaultOpen = true
}: SectionProps) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  // Генерируем уникальный ID для связи кнопки и контента
  const contentId = React.useId();

  return (
    <div className={`border border-[var(--color-ui-border)] rounded-lg bg-[var(--color-paper-bg)] shadow-[var(--shadow-dropdown)] ${className}`}>
      <button
        type="button"
        aria-controls={contentId}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        /* Шапка секции */
        className={`w-full flex items-center justify-between p-3 bg-[var(--color-ui-bg)] hover:bg-[var(--color-ui-bg-hover)] transition-colors rounded-t-lg ${!isOpen ? 'rounded-b-lg' : ''}`}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className="text-[var(--color-ui-accent)]" />}
          <h3 className="text-[11px] font-bold text-[var(--color-ui-text)] uppercase tracking-wider">
            {title}
          </h3>
        </div>
        <ChevronDown
          size={14}
          className={`text-[var(--color-ui-text-muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        id={contentId}
        role="region"
        className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`
        }
      >
        <div className="overflow-hidden">
          <div className="p-3 border-t border-[var(--color-ui-border)]/50">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};