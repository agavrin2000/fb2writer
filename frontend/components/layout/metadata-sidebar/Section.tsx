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
  const contentId = React.useId();

  return (
    <div className={`border border-ui-border rounded-lg bg-paper-bg shadow-dropdown overflow-hidden flex flex-col ${className}`}>
      <button
        type="button"
        aria-controls={contentId}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        /* Шапка секции: убрали rounded-b-lg, добавили focus-visible и cursor-pointer */
        className="w-full flex items-center justify-between p-3 bg-ui-bg hover:bg-ui-bg-hover cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ui-accent/50 focus-visible:z-10"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className="text-ui-accent" />}
          <h3 className="text-[11px] font-bold text-ui-text uppercase tracking-wider font-sans">
            {title}
          </h3>
        </div>
        <ChevronDown
          size={14}
          className={`text-ui-text-muted transition-transform duration-200 ease-out ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Контейнер анимации: разделили transition на отдельные свойства для идеальной плавности */}
      <div
        id={contentId}
        role="region"
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          {/* Подложка контента с прозрачной рамкой Tailwind v4 */}
          <div className="p-3 border-t border-ui-border/50 bg-paper-bg text-paper-text">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
