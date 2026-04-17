"use client";
import React, { memo } from "react";

/**
 * Интерфейс свойств компонента загрузчика.
 */
interface LoaderProps {
  /**
   * Основной заголовок, отображаемый во время загрузки.
   * @default "Обработка"
   */
  title?: string;

  /**
   * Подзаголовок с дополнительной информацией о процессе.
   * @default "Пожалуйста, подождите..."
   */
  subtitle?: string;

  /**
   * Имя файла, который в данный момент обрабатывается (опционально).
   * Если указано — отображается в виде выделенного блока.
   */
  fileName?: string | null;
}

/**
 * Компонент индикатора загрузки (спиннер).
 * Отображается поверх интерфейса при выполнении длительных операций: открытие, сохранение, инициализация.
 * Полупрозрачный фон с размытием (`backdrop-blur`) предотвращает взаимодействие с редактором.
 *
 * Поддерживает:
 * - Анимированный круговой спиннер.
 * - Основной и дополнительный текст.
 * - Отображение имени обрабатываемого файла.
 *
 * Использует `React.memo` для оптимизации перерисовки.
 *
 * @component
 * @param props - Входные параметры компонента {@link LoaderProps}.
 *
 * @example
 * <Loader title="Открытие файла" fileName="книга.fb2" />
 *
 * @example
 * <Loader subtitle="Сохранение документа..." />
 */

export const Loader: React.FC<LoaderProps> = memo(
  ({
    title = "Обработка",
    subtitle = "Пожалуйста, подождите...",
    fileName,
  }) => {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-ui-bg/90 backdrop-blur-md transition-colors duration-500">
        {/* Спиннер: используем акцентный цвет темы */}
        <div className="w-14 h-14 border-4 border-ui-accent/10 border-t-ui-accent rounded-full animate-spin"></div>

        {/* Основной заголовок: привязан к основному тексту и акценту */}
        <div className="mt-6 text-sm font-black text-ui-text uppercase tracking-widest animate-pulse text-center">
          {title}
        </div>

        {/* Имя файла: адаптируется под фон темы */}
        {fileName && (
          <div className="mt-2 px-6 py-1 bg-ui-bg-hover text-ui-accent text-[10px] font-mono rounded-full border border-ui-border max-w-[80%] truncate shadow-sm">
            {fileName}
          </div>
        )}

        {/* Подзаголовок: приглушенный текст */}
        <div className="mt-4 text-[9px] text-ui-text-muted uppercase tracking-[0.3em] text-center px-10">
          {subtitle}
        </div>
      </div>
    );
  },
);


Loader.displayName = "Loader";
