// components/Toast.tsx
import React, { useState, useImperativeHandle, forwardRef } from 'react';

export interface ToastHandle {
  show: (message: string) => void;
}

export const Toast = forwardRef<ToastHandle, {}>((_, ref) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');

  useImperativeHandle(ref, () => ({
    show(msg: string) {
      setMessage(msg);
      setVisible(true);
      setTimeout(() => setVisible(false), 3000);
    }
  }));

  return (
    <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-out 
      ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
      <div className="bg-slate-900/90 backdrop-blur-sm text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10">
        <div className="flex items-center justify-center w-5 h-5 bg-green-500 rounded-full">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="text-sm font-medium tracking-wide">{message}</span>
      </div>
    </div>
  );
});

Toast.displayName = 'Toast';
