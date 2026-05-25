import { memo } from 'react';

/**
 * Компонент строки состояния приложения.
 *
 * Отображает текущий статус загрузки файла и информацию о технологическом стеке.
 * Используется в нижней части интерфейса для предоставления пользователю обратной связи.
 *
 * @param fileName - Имя файла, которое отображается во время загрузки.
 * @param loading - Флаг, указывающий, находится ли приложение в состоянии загрузки.
 *                  Если `true`, показывается сообщение "Загрузка: {fileName}..."; иначе — "Готов".
 * @returns Строка состояния в виде React-компонента.
 *
 * @example
 * ```tsx
 * <StatusBar fileName="document.fb2" loading={true} />
 * ```
 *
 * @remarks
 * Компонент обернут в `memo` для оптимизации производительности,
 * предотвращая лишние перерисовки при отсутствии изменений в пропсах.
 */
export const StatusBar = memo(({ fileName, loading }: { fileName: string, loading: boolean }) => (
    <footer className="h-6 bg-gray-100 border-t flex items-center px-3 text-[10px] text-gray-500 justify-between">
        <div>{loading ? `Загрузка: ${fileName}...` : 'Готов'}</div>
        <div className="flex gap-4">
            <span>Next.js + Photino</span>
        </div>
    </footer>
));

StatusBar.displayName = 'StatusBar';