import React from 'react';
import { AlertTriangle, LogOut, X } from 'lucide-react';

interface ExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ExitModal = ({ isOpen, onClose, onConfirm }: ExitModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-[400px] rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Декоративная полоса сверху */}
        <div className="h-1.5 bg-red-500 w-full" />
        
        <div className="p-8">
          <div className="flex flex-col items-center text-center">
            {/* Иконка предупреждения */}
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 ring-8 ring-red-50/50">
              <AlertTriangle size={32} />
            </div>

            <h2 className="text-xl font-black text-gray-900 mb-2">Выход из редактора</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              Вы уверены, что хотите выйти? Все <span className="font-bold text-red-600">несохраненные изменения</span> в книге будут безвозвратно потеряны.
            </p>

            <div className="flex gap-3 w-full">
              {/* Кнопка отмены */}
              <button 
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-all active:scale-95"
              >
                Остаться
              </button>
              
              {/* Кнопка подтверждения */}
              <button 
                onClick={onConfirm}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <LogOut size={16} />
                Выйти
              </button>
            </div>
          </div>
        </div>

        {/* Кнопка закрытия в углу */}
        <button title='Close'
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};
