"use client"
import React, { createContext, useContext, useRef, ReactNode } from 'react';
import { ConfirmDialog, ConfirmHandle } from '@/components/ui/ConfirmDialog';

/**
 * Контекст для предоставления функциональности модального окна подтверждения.
 * Содержит методы из {@link ConfirmHandle} для отображения диалогов подтверждения в любом месте приложения.
 */
const ConfirmContext = createContext<ConfirmHandle | null>(null);

/**
 * Поставщик контекста подтверждения.
 * Оборачивает дочерние компоненты и предоставляет доступ к методу `ask` через хук {@link useConfirm}.
 * Внутри рендерит один экземпляр {@link ConfirmDialog}, управляющий отображением модальных окон.
 *
 * @component
 * @param children - Дочерние элементы, которым будет доступен контекст подтверждения.
 *
 * @example
 * // В корневом компоненте приложения
 * <ConfirmProvider>
 *   <App />
 * </ConfirmProvider>
 */
export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const confirmRef = useRef<ConfirmHandle>(null);

  return (
    <ConfirmContext.Provider value={{
      // Проксируем вызов ask через ref, возвращая false при отсутствии диалога
      ask: (title, message, variant) =>
        confirmRef.current?.ask(title, message, variant) ?? Promise.resolve(false)
    }}>
      {children}
      {/* Единственный экземпляр диалога подтверждения в приложении */}      <ConfirmDialog ref={confirmRef} />
    </ConfirmContext.Provider>
  );
};

/**
 * Хук для удобного использования функционала подтверждения.
 * Позволяет вызывать модальные окна подтверждения из любого компонента,
 * обёрнутого в {@link ConfirmProvider}.
 *
 * @returns Объект с методом {@link ConfirmHandle.ask}.
 *
 * @throws Ошибка, если хук используется вне {@link ConfirmProvider}.
 *
 * @example
 * const confirm = useConfirm();
 * const isConfirmed = await confirm.ask("Удалить?", "Это действие нельзя отменить.", "danger");
 */
export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used within ConfirmProvider');
  return context;
};