'use client';

interface LoaderProps {
  title?: string;
  subtitle?: string;
  fileName?: string | null;
}

export const Loader: React.FC<LoaderProps> = ({ 
  title = "Обработка", 
  subtitle = "Пожалуйста, подождите...", 
  fileName 
}) => {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-md transition-all">
      {/* Спиннер */}
      <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>

      {/* Основной заголовок */}
      <div className="mt-6 text-sm font-black text-indigo-900 uppercase tracking-widest animate-pulse text-center">
        {title}
      </div>

      {/* Имя файла (показываем только если передано) */}
      {fileName && (
        <div className="mt-2 px-6 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-mono rounded-full border border-indigo-100 max-w-[80%] truncate">
          {fileName}
        </div>
      )}

      {/* Подзаголовок с технической инфой */}
      <div className="mt-4 text-[9px] text-gray-400 uppercase tracking-[0.3em] text-center px-10">
        {subtitle}
      </div>
    </div>
  );
};
