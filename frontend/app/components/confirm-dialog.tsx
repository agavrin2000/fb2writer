import React, { useState, useImperativeHandle, forwardRef } from 'react';

// Типы для настроек диалога
type DialogVariant = 'default' | 'danger';

interface DialogConfig {
  title: string;
  message: string;
  variant?: DialogVariant;
  resolve: (val: boolean) => void;
}

export interface ConfirmHandle {
  ask: (title: string, message: string, variant?: DialogVariant) => Promise<boolean>;
}

export const ConfirmDialog = forwardRef<ConfirmHandle, {}>((_, ref) => {
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

  const close = (value: boolean) => {
    setIsAnimate(false);
    // Ждем окончания анимации перед размонтированием
    setTimeout(() => {
      config?.resolve(value);
      setConfig(null);
    }, 200);
  };

  if (!config) return null;

  const isDanger = config.variant === 'danger';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay (Задний фон) */}
      <div 
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          isAnimate ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => close(false)} 
      />
      
      {/* Modal Card */}
      <div className={`relative bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all duration-300 ${
        isAnimate ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
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
            className={`flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-xl shadow-md transition-all active:scale-95 ${
              isDanger 
                ? 'bg-red-500 hover:bg-red-600 shadow-red-100' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
            }`}
          >
            {isDanger ? 'Удалить' : 'Подтвердить'}
          </button>
        </div>
      </div>
    </div>
  );
});

ConfirmDialog.displayName = 'ConfirmDialog';
