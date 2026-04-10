import React, { useState, useImperativeHandle, forwardRef, memo, useEffect, useRef, useCallback } from "react";

/**
 * Тип уведомления, определяющий его внешний вид и поведение.
 */
export type ToastType = "success" | "error" | "info";

/**
 * Интерфейс, предоставляющий методы для управления отображением уведомления.
 * Может использоваться через `ref` для императивного вызова.
 */
export interface ToastHandle {
  /**
   * Показывает уведомление с заданным сообщением и типом.
   * @param message - Текст сообщения, который будет отображён в тосте.
   * @param type - Тип уведомления: `'success'`, `'error'` или `'info'`. По умолчанию `'success'`.
   *
   * @example
   * toastRef.current?.show("Файл успешно сохранён", "success");
   */
  show: (message: string, type?: ToastType) => void;

  /**
   * Принудительно скрывает уведомление, даже если оно ещё не исчезло автоматически.
   *
   * @example
   * toastRef.current?.hide();
   */
  hide: () => void;
}

/**
 * Конфигурация стилей и иконок для каждого типа уведомления.
 */
const config = {
  success: {
    bg: "bg-green-500",
    icon: (
      <svg
        className="w-3 h-3 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
          d="M5 13l4 4L19 7"
        />
      </svg>
    ),
  },
  error: {
    bg: "bg-red-500",
    icon: (
      <svg
        className="w-3 h-3 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    ),
  },
  info: {
    bg: "bg-blue-500",
    icon: (
      <svg
        className="w-3 h-3 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
};

/**
 * Компонент всплывающего уведомления (toast), отображаемого в нижней части экрана.
 * Предназначен для краткосрочного информирования пользователя о результатах действий:
 * успешных операциях, ошибках, предупреждениях и т.д.
 *
 * Особенности:
 * - Автоматически скрывается через 3 секунды (кроме ошибок).
 * - Для ошибок отображается кнопка закрытия.
 * - Поддерживает три типа: успех, ошибка, информация.
 * - Анимированное появление и исчезновение.
 * - Использует `React.memo` и императивный реф для оптимизации и контроля извне.
 *
 * @component
 * @param _ - Не принимает явных свойств; управление осуществляется через `ref`.
 * @param ref - Реф, через который можно вызывать методы {@link ToastHandle}.
 *
 * @example
 * import { useRef } from 'react';
 * import { Toast, ToastHandle } from './Toast';
 *
 * const App = () => {
 *   const toastRef = useRef<ToastHandle>(null);
 *   return (
 *     <>
 *       <Toast ref={toastRef} />
 *       <button onClick={() => toastRef.current?.show("Готово!", "success")}>
 *         Показать уведомление
 *       </button>
 *     </>
 *   );
 * };
 */export const Toast = memo(
  forwardRef<ToastHandle, {}>((_, ref) => {
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState("");
    const [type, setType] = useState<ToastType>("success");

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Скрыть toast после 3 секунд (кроме ошибок)
    const hide = useCallback(() => {
      setVisible(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }, []);

    // Очистка таймера при размонтировании
    useEffect(() => {
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }, []);

    useImperativeHandle(ref, () => ({
      show(msg: string, t: ToastType = "success") {
        // 1. Немедленно очищаем старый таймер, если он был
        if (timerRef.current) clearTimeout(timerRef.current);

        setMessage(msg);
        setType(t);
        setVisible(true);

        if (t !== "error") {
          // 2. Устанавливаем новый таймер и сохраняем его в Ref
          timerRef.current = setTimeout(() => {
            setVisible(false);
            timerRef.current = null;
          }, 3000);
        }
      },
      hide,
    }));
    const currentConfig = config[type];

    return (
      <div
        className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-out 
      ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"}
      w-[calc(100%-2rem)] max-w-md`}
      >
        <div className="bg-slate-900/95 backdrop-blur-sm text-white px-5 py-4 rounded-2xl shadow-2xl flex items-start gap-3 border border-white/10 relative group">
          {/* Индикатор статуса */}
          <div
            className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 mt-0.5 ${currentConfig.bg}`}
          >
            {currentConfig.icon}
          </div>

          {/* Текст сообщения (многострочный) */}
          <span className="text-sm font-medium tracking-wide break-words flex-1 pr-1">
            {message}
          </span>

          {/* Кнопка закрытия (только для ошибок) */}
          {type === "error" && (
            <button
              onClick={hide}
              className="shrink-0 p-1 -mr-1 -mt-1 rounded-lg hover:bg-white/10 transition-colors"
              title="Закрыть"
            >
              <svg
                className="w-4 h-4 text-white/40 group-hover:text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }),
);

Toast.displayName = "Toast";
