import React, { useState, useImperativeHandle, forwardRef } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastHandle {
  show: (message: string, type?: ToastType) => void;
}

const config = {
  success: {
    bg: 'bg-green-500',
    icon: (
      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    bg: 'bg-red-500',
    icon: (
      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  info: {
    bg: 'bg-blue-500',
    icon: (
      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

export const Toast = forwardRef<ToastHandle, {}>((_, ref) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('success');
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  useImperativeHandle(ref, () => ({
    show(msg: string, t: ToastType = 'success') {
      // Сброс предыдущего таймера, если он был
      if (timer) clearTimeout(timer);
      
      setMessage(msg);
      setType(t);
      setVisible(true);

      const newTimer = setTimeout(() => setVisible(false), 3000);
      setTimer(newTimer);
    }
  }));

  const currentConfig = config[type];

  return (
    <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-out 
      ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
      <div className="bg-slate-900/90 backdrop-blur-sm text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10">
        <div className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 ${currentConfig.bg}`}>
          {currentConfig.icon}
        </div>
        <span className="text-sm font-medium tracking-wide whitespace-nowrap">{message}</span>
      </div>
    </div>
  );
});

Toast.displayName = 'Toast';
