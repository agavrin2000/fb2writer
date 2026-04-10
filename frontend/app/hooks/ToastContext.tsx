"use client";
import React, { createContext, useContext, useRef, ReactNode, useMemo } from 'react';
import { Toast, ToastHandle, ToastType } from '@/components/ui/Toast';

/**
 * Интерфейс контекста уведомлений.
 * Определяет методы для показа всплывающих сообщений различного типа.
 */
interface ToastContextType {
  /**
   * Показывает уведомление с указанным сообщением и типом.
   * @param message - Текст сообщения.
   * @param type - Тип уведомления: `'success'`, `'error'`, `'info'`. По умолчанию `'success'`.
   */
  show: (message: string, type?: ToastType) => void;

  /**
   * Показывает успешное уведомление.
   * @param message - Текст сообщения.
   */
  success: (message: string) => void;

  /**
   * Показывает уведомление об ошибке.
   * @param message - Текст сообщения об ошибке.
   */
  error: (message: string) => void;

  /**
   * Показывает информационное уведомление.
   * @param message - Текст информационного сообщения.
   */
  info: (message: string) => void;
}

/**
 * Контекст для управления всплывающими уведомлениями (toast).
 * Предоставляет доступ к методам показа уведомлений из любого компонента приложения.
 */
const ToastContext = createContext<ToastContextType | null>(null);

/**
 * Поставщик контекста уведомлений.
 * Оборачивает дочерние компоненты и предоставляет возможность показывать toast-уведомления.
 * Внутри рендерит один экземпляр компонента {@link Toast}, управляющий отображением.
 *
 * @component
 * @param children - Дочерние элементы, которым будет доступен функционал уведомлений.
 *
 * @example
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const toastRef = useRef<ToastHandle>(null);

  // Мемоизируем API, чтобы предотвратить лишние перерисовки потребителей
  const api = useMemo(() => ({
    show: (msg: string, type: ToastType = "success") => toastRef.current?.show(msg, type),
    success: (msg: string) => toastRef.current?.show(msg, "success"),
    error: (msg: string) => toastRef.current?.show(msg, "error"),
    info: (msg: string) => toastRef.current?.show(msg, "info"),
  }), []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toast ref={toastRef} />
    </ToastContext.Provider>
  );
};

/**
 * Хук для удобного вызова всплывающих уведомлений.
 * Позволяет показывать сообщения из любого компонента, обёрнутого в {@link ToastProvider}.
 *
 * @returns Объект с методами `show`, `success`, `error`, `info` для отображения уведомлений.
 *
 * @throws Ошибка, если хук используется вне {@link ToastProvider}.
 *
 * @example
 * const toast = useToast();
 * toast.success("Файл сохранён!");
 * toast.error("Не удалось загрузить данные.");
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};