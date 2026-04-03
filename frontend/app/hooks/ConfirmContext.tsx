"use client"
import React, { createContext, useContext, useRef, ReactNode } from 'react';
import { ConfirmDialog, ConfirmHandle } from '@/components/ui/ConfirmDialog'; // Путь к вашему файлу

const ConfirmContext = createContext<ConfirmHandle | null>(null);

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const confirmRef = useRef<ConfirmHandle>(null);

  return (
    <ConfirmContext.Provider value={{
      // Проксируем вызов ask через ref
      ask: (title, message, variant) => 
        confirmRef.current?.ask(title, message, variant) ?? Promise.resolve(false)
    }}>
      {children}
      {/* Размещаем сам диалог один раз на всё приложение */}
      <ConfirmDialog ref={confirmRef} />
    </ConfirmContext.Provider>
  );
};

// Хук для удобного использования
export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used within ConfirmProvider');
  return context;
};