"use client"
import React, { createContext, useContext, useRef, ReactNode, useMemo } from 'react';
import { Toast, ToastHandle, ToastType } from '@/components/ui/Toast'; // проверьте путь

interface ToastContextType {
  show: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const toastRef = useRef<ToastHandle>(null);

  // Мемоизируем методы, чтобы не вызывать лишних ререндеров у потребителей
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

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
