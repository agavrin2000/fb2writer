import React from "react";
import { Image as ImageIcon, X, Upload, Download } from "lucide-react";

interface CoverPickerProps {
  value?: string; // Строка base64
  onUpdate: (base64: string) => void;
}

export const CoverPicker = ({ value, onUpdate }: CoverPickerProps) => {
  // Функция для обработки загрузки локального файла
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate(reader.result as string); // Сохраняем как DataURL (base64)
      };
      reader.readAsDataURL(file);
    }
  };

  // Функция сохранения картинки на диск
  const handleDownload = () => {
    if (!value) return;

    const link = document.createElement("a");
    // Если в value чистый base64 без префикса, добавляем его для скачивания
    link.href = value.startsWith("data:image")
      ? value
      : `data:image/jpeg;base64,${value}`;
    link.download = `cover-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Проверяем, есть ли уже префикс data:image, если нет — добавляем (для чистого base64 из FB2)
  const imageSrc = value?.startsWith("data:image")
    ? value
    : value
      ? `data:image/jpeg;base64,${value}`
      : null;

  return (
    <div className="mb-6">
      <label className="block text-[9px] font-bold text-gray-400 uppercase mb-2 ml-0.5 tracking-wider">
        Обложка книги
      </label>

      <div className="relative group aspect-3/4 w-40 mx-auto bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 overflow-hidden flex flex-col items-center justify-center transition-all hover:border-blue-300 shadow-inner">
        {imageSrc ? (
          <>
            <img
              src={imageSrc}
              alt="Обложка"
              className="w-full h-full object-cover"
            />
            {/* Кнопки управления при наведении */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <label
                title="Загрузить новое изображение"
                className="p-2 bg-white rounded-full text-blue-600 hover:bg-blue-50 shadow-lg cursor-pointer transition-transform hover:scale-110"
              >
                <Upload size={16} />
                <span className="sr-only">Загрузить изображение</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </label>
              {/* Кнопка Сохранить (НОВАЯ) */}
              <button
                type="button"
                onClick={handleDownload}
                title="Сохранить файл"
                className="p-2 bg-white rounded-full text-emerald-600 hover:bg-emerald-50 shadow-lg transition-transform hover:scale-110"
              >
                <Download size={16} />
              </button>
              <button
                type="button"
                title="Удалить"
                onClick={() => onUpdate("")}
                className="p-2 bg-white rounded-full text-red-500 hover:bg-red-50 shadow-lg transition-transform hover:scale-110"
              >
                <X size={16} />
              </button>
            </div>
          </>
        ) : (
          <label className="flex flex-col items-center text-gray-400 gap-2 cursor-pointer hover:text-blue-500 transition-colors">
            <ImageIcon size={32} strokeWidth={1} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">
              Загрузить
            </span>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
          </label>
        )}
      </div>
    </div>
  );
};
