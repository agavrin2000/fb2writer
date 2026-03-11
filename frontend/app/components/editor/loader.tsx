'use client';

interface LoaderProps {
  fileName: string;
}

export const Loader: React.FC<LoaderProps> = ({ fileName }) => {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-md transition-all">
      {/* Анимированный спиннер */}
      <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>

      <div className="mt-6 text-sm font-black text-indigo-900 uppercase tracking-widest animate-pulse">
        Загрузка книги
      </div>

      {/* ОТОБРАЖЕНИЕ ИМЕНИ ФАЙЛА */}
      <div className="mt-2 px-6 py-1 bg-indigo-50 text-indigo-600 text-xs font-mono rounded-full border border-indigo-100 max-w-[80%] truncate">
        {fileName || 'Обработка...'}
      </div>

      <div className="mt-4 text-[9px] text-gray-400 uppercase tracking-[0.3em]">
        Парсинг XML и извлечение Binary
      </div>
    </div>
  );
};