import React from 'react';
import { X, Info, Github, BookOpen, Command } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal = ({ isOpen, onClose }: AboutModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-[520px] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Шапка модального окна */}
        <div className="bg-gray-50/50 px-6 py-4 border-b flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-blue-200 shadow-lg">
              <BookOpen size={18} />
            </div>
            <span className="font-bold text-gray-800 tracking-tight">О программе</span>
          </div>
          <button title='Close'
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          {/* Заголовок и версия */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              FB2 Editor
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                v1.0.0 Beta
              </span>
            </h2>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
              Современный инструмент для подготовки и редактирования электронных книг в формате FictionBook 2.0.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10">
            {/* Левая колонка: Описание */}
            <div className="space-y-5">
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Разработка</span>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Построено на базе <strong>Tiptap</strong> и <strong>React</strong>. 
                  Весь исходный код открыт и доступен для сообщества.
                </p>
              </div>
              
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-blue-600 transition-colors bg-gray-100 hover:bg-blue-50 px-3 py-2 rounded-lg"
              >
                <Github size={16} />
                Проект на GitHub
              </a>
            </div>

            {/* Правая колонка: Горячие клавиши */}
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                <Command size={12} /> Быстрые клавиши
              </span>
              <div className="space-y-2.5">
                <HotkeyRow label="Открыть файл" keys={['Ctrl', 'O']} />
                <HotkeyRow label="Сохранить" keys={['Ctrl', 'S']} />
                <HotkeyRow label="Тулбар" keys={['Alt', 'B']} />
                <HotkeyRow label="Жирный" keys={['Ctrl', 'B']} />
                <HotkeyRow label="Курсив" keys={['Ctrl', 'I']} />
              </div>
            </div>
          </div>

          {/* Кнопка закрытия */}
          <button 
            onClick={onClose}
            className="mt-10 w-full bg-gray-900 text-white py-3 rounded-xl hover:bg-black active:scale-[0.98] transition-all font-bold text-sm shadow-xl shadow-gray-200"
          >
            Принять и продолжить
          </button>
        </div>
        
        <div className="bg-gray-50 px-6 py-3 text-center">
            <p className="text-[10px] text-gray-400 italic">Сделано с любовью к чтению • 2024</p>
        </div>
      </div>
    </div>
  );
};

// Вспомогательный компонент для клавиш
const HotkeyRow = ({ label, keys }: { label: string, keys: string[] }) => (
  <div className="flex justify-between items-center group">
    <span className="text-[11px] text-gray-500 group-hover:text-gray-700 transition-colors">{label}</span>
    <div className="flex gap-1">
      {keys.map(key => (
        <kbd key={key} className="min-w-[20px] px-1.5 py-0.5 bg-white border border-gray-300 border-b-2 rounded text-[9px] font-sans font-bold shadow-sm text-gray-600 flex items-center justify-center">
          {key}
        </kbd>
      ))}
    </div>
  </div>
);
