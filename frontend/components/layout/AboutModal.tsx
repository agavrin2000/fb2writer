import { useCallback, useMemo, useState } from 'react';
import { X, BookOpen, Command, LucideProps } from 'lucide-react';
import { AppInfo } from '../../types/types';
import { usePhotinoEvents } from '../../hooks/usePhotinoEvents';
import { Backdrop } from "@/components/ui/Backdrop"

/**
 * SVG-иконка GitHub.
 *
 * @param props - Свойства, передаваемые в SVG-элемент (включая стили и обработчики).
 * @returns Векторная иконка GitHub в виде React-компонента.
 */
const GithubIcon = (props: LucideProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.28 1.15-.28 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

/**
 * Интерфейс свойств компонента AboutModal.
 */
interface AboutModalProps {
  /**
   * Флаг открытия модального окна.
   * Если `true`, модальное окно отображается, иначе — скрыто.
   */
  isOpen: boolean;

  /**
   * Обработчик закрытия модального окна.
   * Вызывается при нажатии на кнопку закрытия или вне области окна.
   */
  onClose: () => void;
}

/**
 * Компонент модального окна «О программе».
 *
 * Отображает информацию о приложении: название, версию, описание,
 * ссылку на репозиторий GitHub, а также список горячих клавиш.
 * Получает данные о приложении через событие от Photino.
 *
 * @param props - Свойства компонента {@link AboutModalProps}.
 * @returns Отрисовывает модальное окно, если `isOpen` равно `true`, иначе — `null`.
 *
 * @example
 * ```tsx
 * <AboutModal isOpen={true} onClose={() => setIsOpen(false)} />
 * ```
 */
export const AboutModal = ({ isOpen, onClose }: AboutModalProps) => {
  /**
   * Состояние с информацией о приложении.
   * Изначально содержит заглушку, которая позже заменяется данными из события.
   */
  const [appDetails, setAppDetails] = useState<AppInfo>({ name: 'FB2 Writer', version: '0.0.0' });

  /**
   * Обработчик события `app-info`, приходящего от Photino.
   * Обновляет состояние `appDetails` новыми данными о приложении.
   *
   * Поддерживает как строковый (JSON), так и объектный формат полезной нагрузки.
   *
   * @param payload - Данные события, содержащие информацию о приложении.
   * Может быть строкой в формате JSON или объектом типа {@link AppInfo}.
   *
   * @event app-info
   */
  const onAppInfo = useCallback(
    (payload: string | object | null) => {
      if (typeof payload === 'string') {
        setAppDetails(JSON.parse(payload));
        return;
      }
      if (typeof payload === 'object' && payload !== null) {
        setAppDetails(payload as AppInfo);
        return;
      }
    },
    [setAppDetails],
  );

  /**
   * Объект с обработчиками событий, получаемых от Photino.
   * Каждый ключ соответствует имени события, значение — функция-обработчик.
   *
   * Используется хуком {@link usePhotinoEvents} для подписки на события.
   *
   * @constant
   * @type {Object.<string, (payload: any) => void>}
   */
  const eventHandlers = useMemo(
    () => ({
      'app-info': onAppInfo,
    }),
    [onAppInfo],
  );

  // Подписываемся на события от Photino
  usePhotinoEvents(eventHandlers);

  // Если окно не открыто — ничего не отрисовываем
  if (!isOpen) return null;

  return (
    <>
        {/* Фоновая подложка (Backdrop) */}
        <Backdrop disableCloseOnClick={true} />
    
      {/* Подложка */}
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      
      {/* Основной контейнер модального окна */}
      <div className="bg-ui-bg text-ui-text w-[520px] rounded-2xl shadow-2xl border border-ui-border overflow-hidden animate-in zoom-in-95 duration-200 transition-colors">
        {/* Шапка модального окна */}
        <div className="bg-ui-bg-hover/30 px-6 py-4 border-b border-ui-border flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BookOpen size={18} className="text-white" />
            </div>
            <span className="font-bold tracking-tight">О программе</span>
          </div>
          <button
            title="Close"
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-ui-bg-hover text-ui-text-muted hover:text-ui-text transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          {/* Заголовок и версия */}
          <div className="mb-8">
            <h2 className="text-3xl font-black flex items-center gap-3">
              {appDetails.name}
              <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                v{appDetails.version}
              </span>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ui-text-muted">
              Современный инструмент для подготовки и редактирования электронных книг в формате FictionBook 2.0.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10">
            {/* Левая колонка: Описание */}
            <div className="space-y-5">
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold text-ui-text-muted uppercase tracking-[0.2em]">Разработка</span>
                <p className="text-xs text-ui-text-muted leading-relaxed">
                  Построено на базе <strong className="text-ui-text">Tiptap</strong> и <strong className="text-ui-text">React</strong>.
                  Весь исходный код открыт и доступен для сообщества.
                </p>
              </div>

              <a
                href="https://github.com/agavrin2000/fb2writer"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-ui-text-muted hover:text-blue-500 transition-all bg-ui-bg-hover px-3 py-2 rounded-lg border border-ui-border"
              >
                <GithubIcon size={16} />
                Проект на GitHub
              </a>
            </div>

            {/* Правая колонка: Горячие клавиши */}
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-ui-text-muted uppercase tracking-[0.2em] flex items-center gap-1.5">
                <Command size={12} /> Быстрые клавиши
              </span>
              <div className="space-y-2.5">
                <HotkeyRow label="Открыть файл" keys={['Ctrl', 'O']} />
                <HotkeyRow label="Сохранить" keys={['Ctrl', 'S']} />
                <HotkeyRow label="Структура книги" keys={['Alt', 'B']} />
                <HotkeyRow label="Метаинформация" keys={['Alt', 'I']} />
                <HotkeyRow label="Жирный" keys={['Ctrl', 'B']} />
                <HotkeyRow label="Курсив" keys={['Ctrl', 'I']} />
              </div>
            </div>
          </div>

          {/* Кнопка закрытия: инвертируем цвета для темной темы */}
          <button
            type="button"
            onClick={onClose}
            className="mt-10 w-full bg-ui-text text-ui-bg py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all font-bold text-sm shadow-xl shadow-blue-500/10"
          >
            Принять и продолжить
          </button>
        </div>

        <div className="bg-ui-bg-hover/50 px-6 py-3 text-center border-t border-ui-border">
          <p className="text-[10px] text-ui-text-muted italic">Сделано с любовью к чтению • 2026</p>
        </div>
      </div>
    </div>
    </>
  );
};

/**
 * Компонент строки горячей клавиши.
 *
 * Отображает метку действия и комбинацию клавиш в виде `kbd` элементов.
 *
 * @param label - Текстовое описание действия (например, "Сохранить").
 * @param keys - Массив строк, представляющих клавиши комбинации (например, `['Ctrl', 'S']`).
 * @returns Строка с меткой и визуальным отображением комбинации клавиш.
 *
 * @example
 * ```tsx
 * <HotkeyRow label="Сохранить" keys={['Ctrl', 'S']} />
 * ```
 */
const HotkeyRow = ({ label, keys }: { label: string; keys: string[] }) => (
  <div className="flex justify-between items-center group">
    <span className="text-[11px] text-ui-text-muted group-hover:text-ui-text transition-colors">{label}</span>
    <div className="flex gap-1">
      {keys.map((key) => (
        <kbd
          key={key}
          className="min-w-[20px] px-1.5 py-0.5 bg-ui-bg border border-ui-border border-b-2 rounded text-[9px] font-sans font-bold shadow-sm text-ui-text-muted flex items-center justify-center uppercase"
        >
          {key}
        </kbd>
      ))}
    </div>
  </div>
);