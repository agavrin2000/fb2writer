import React from "react";
import { Image as ImageIcon, X, Upload, Download } from "lucide-react";
import Image from 'next/image';

/**
 * Интерфейс свойств компонента выбора обложки книги.
 */
interface CoverPickerProps {
  /**
   * Строка в формате base64, представляющая изображение обложки.
   * Может быть `undefined`, если обложка не установлена.
   */
  value?: string;

  /**
   * Функция обратного вызова, вызываемая при изменении изображения.
   * Принимает новое значение в виде DataURL (base64).
   * @param base64 - Новое изображение в формате строки base64 с префиксом MIME-типа.
   */
  onUpdate: (base64: string) => void;
}

/**
 * Компонент для выбора, просмотра и управления изображением обложки книги.
 * Позволяет:
 * - Загружать изображение с локального устройства.
 * - Просматривать текущую обложку.
 * - Скачивать изображение на диск.
 * - Удалять установленную обложку.
 *
 * Особенности:
 * - Поддерживает как полные DataURL (`data:image/...`), так и чистые строки base64.
 * - Автоматически добавляет префикс `data:image/jpeg;base64,` к чистому base64 для корректного отображения.
 * - Отображает интерактивный оверлей с кнопками действий при наведении.
 * - Использует `next/image` с `unoptimized`, так как работает с base64-данными.
 *
 * @component
 * @param props - Входные параметры компонента {@link CoverPickerProps}.
 *
 * @example
 * <CoverPicker
 *   value={coverBase64}
 *   onUpdate={(newBase64) => setCover(newBase64)}
 * />
 */
export const CoverPicker = ({ value, onUpdate }: CoverPickerProps) => {
  // Обработчик загрузки нового изображения с устройства
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

  // Обработчик скачивания текущего изображения
  const handleDownload = () => {
    if (!value) return;

    const link = document.createElement("a");
    // Если в значении уже есть префикс — используем как есть, иначе добавляем
    link.href = value.startsWith("data:image")
      ? value
      : `data:image/jpeg;base64,${value}`;
    link.download = `cover-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Формируем корректный источник изображения для отображения
  const imageSrc = value?.startsWith("data:image")
    ? value
    : value
      ? `data:image/jpeg;base64,${value}`
      : null;

  return (
    <div className="mb-6">
      <label className="block text-[9px] font-bold text-[var(--color-ui-text-muted)] uppercase mb-2 ml-0.5 tracking-wider">
        Обложка книги
      </label>

      <div className="relative group aspect-[3/4] w-40 mx-auto bg-[var(--color-ui-bg)] rounded-lg border-2 border-dashed border-[var(--color-ui-border)] overflow-hidden flex flex-col items-center justify-center transition-all hover:border-[var(--color-ui-accent)] shadow-inner">
        {imageSrc ? (
          <>
            <Image
              src={imageSrc}
              alt="Обложка"
              fill
              className="w-full h-full object-cover"
              unoptimized
            />
            {/* Оверлей с действиями при наведении */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <label
                title="Загрузить новое изображение"
                className="p-2 bg-[var(--color-paper-bg)] rounded-full text-[var(--color-ui-accent)] hover:bg-[var(--color-ui-bg-hover)] shadow-lg cursor-pointer transition-transform hover:scale-110"
              >
                <Upload size={16} />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                  aria-label="Загрузить новое изображение обложки"
                />
              </label>

              <button
                type="button"
                onClick={handleDownload}
                title="Сохранить файл"
                className="p-2 bg-[var(--color-paper-bg)] rounded-full text-emerald-500 hover:bg-[var(--color-ui-bg-hover)] shadow-lg transition-transform hover:scale-110"
              >
                <Download size={16} />
              </button>

              <button
                type="button"
                title="Удалить"
                onClick={() => onUpdate("")}
                className="p-2 bg-[var(--color-paper-bg)] rounded-full text-red-500 hover:bg-[var(--color-ui-bg-hover)] shadow-lg transition-transform hover:scale-110"
              >
                <X size={16} />
              </button>
            </div>
          </>
        ) : (
          <label className="flex flex-col items-center text-[var(--color-ui-text-muted)] gap-2 cursor-pointer hover:text-[var(--color-ui-accent)] transition-colors">
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