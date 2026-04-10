import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';

/**
 * Типы для настроек диалога подтверждения.
 */
type DialogVariant = 'default' | 'danger';

/**
 * Конфигурация отображаемого диалога подтверждения.
 */
interface DialogConfig {
  /**
   * Заголовок диалогового окна.
   */
  title: string;

  /**
   * Основное сообщение с пояснением действия.
   */
  message: string;

  /**
   * Вариант оформления диалога: обычный или опасный (например, удаление).
   * @default 'default'
   */
  variant?: DialogVariant;

  /**
   * Функция-резолвер промиса, вызываемая при закрытии диалога.
   */
  resolve: (val: boolean) => void;
}

/**
 * Интерфейс реф-объекта, предоставляемый компонентом {@link ConfirmDialog}.
 * Позволяет вызывать метод `ask` извне для отображения модального окна.
 */
export interface ConfirmHandle {
  /**
 * Открывает модальное окно подтверждения и возвращает Promise.
 * @param title - Заголовок окна.
 * @param message - Текстовое сообщение.
 * @param variant - Вариант стилизации: `'default'` или `'danger'`.
 * @returns `true`, если пользователь нажал "OK", иначе `false`.
 *
 * @example
 * const confirmed = await confirmRef.current?.ask(
 *   "Удалить файл?",
 *   "Это действие нельзя отменить.",
 *   "danger"
 * );
 */
  ask: (title: string, message: string, variant?: DialogVariant) => Promise<boolean>;
}

/**
 * Компонент модального диалога подтверждения действий.
 * Предоставляет централизованный способ запроса подтверждения у пользователя
 * через всплывающее окно с возможностью отмены.
 *
 * Реализован как императивный хук через `useImperativeHandle`,
 * что позволяет вызывать его извне без управления состоянием напрямую.
 *
 * Поддерживает:
 * - Анимацию появления и исчезновения.
 * - Обработку клавиши Escape.
 * - Два варианта оформления: обычный и опасный (красный стиль).
 *
 * @component
 * @param _ - Не принимает явных свойств, управление осуществляется через реф.
 * @param ref - Реф, через который предоставляется метод {@link ConfirmHandle.ask}.
 *
 * @example
 * import { useRef } from 'react';
 * import { ConfirmDialog, ConfirmHandle } from './ConfirmDialog';
 *
 * const App = () => {
 *   const confirmRef = useRef<ConfirmHandle>(null);
 *   return (
 *     <>
 *       <ConfirmDialog ref={confirmRef} />
 *       <button onClick={async () => {
 *         const ok = await confirmRef.current?.ask("Выйти?", "Несохранённые изменения будут потеряны.");
 *         if (ok) window.close();
 *       }}>
 *         Выйти
 *       </button>
 *     </>
 *   );
 * };
 */export const ConfirmDialog = forwardRef<ConfirmHandle, {}>((_, ref) => {
  const [config, setConfig] = useState<DialogConfig | null>(null);
  const [isAnimate, setIsAnimate] = useState(false);

  useImperativeHandle(ref, () => ({
    ask(title, message, variant = 'default') {
      return new Promise((resolve) => {
        setConfig({ title, message, variant, resolve });
        // Небольшая задержка для запуска анимации появления
        setTimeout(() => setIsAnimate(true), 10);
      });
    }
  }));

  /**
   * Закрывает диалог и разрешает промис с указанным значением.
   * @param value - Результат действия: `true` — подтверждено, `false` — отменено.
   */
  const close = (value: boolean) => {
    if (!config) return;

    setIsAnimate(false);
    // Извлекаем resolve сразу, чтобы не потерять его при быстрой смене config
    const currentResolve = config.resolve;

    setTimeout(() => {
      currentResolve(value); // Разрешаем Promise
      setConfig(null);
    }, 200);
  };

  // Закрытие по клавише Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && config) close(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [config]);

  if (!config) return null;

  const isDanger = config.variant === 'danger';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay (Задний фон) */}
      <div
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${isAnimate ? 'opacity-100' : 'opacity-0'
          }`}
        onClick={() => close(false)}
      />

      {/* Модальное окно */}
      <div className={`relative bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all duration-300 ${isAnimate ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
        }`}>
        <div className="p-6">
          <h3 className={`text-lg font-bold mb-2 ${isDanger ? 'text-red-600' : 'text-slate-900'}`}>
            {config.title}
          </h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            {config.message}
          </p>
        </div>

        <div className="flex border-t border-slate-100 bg-slate-50/50 p-3 gap-3">
          <button
            type="button"
            onClick={() => close(false)}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className={`flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-xl shadow-md transition-all active:scale-95 ${isDanger
              ? 'bg-red-500 hover:bg-red-600 shadow-red-100'
              : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
              }`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
});

ConfirmDialog.displayName = 'ConfirmDialog';
