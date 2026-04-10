import { LucideIcon, Plus, X } from 'lucide-react'


/**
 * Интерфейс свойств компонента иконки с действием.
 */
interface ActionIconProps {
  /**
   * Основная иконка из библиотеки Lucide (например, `ALargeSmall`, `Quote` и т.д.).
   */
  icon: LucideIcon;

  /**
   * Режим отображения дополнительного индикатора: 
   * - `'add'` — показывает зелёный плюс;
   * - `'remove'` — показывает красный крестик.
   */
  mode: 'add' | 'remove';

  /**
   * Размер основной иконки в пикселях.
   * @default 20
   */
  size?: number;

  /**
   * Дополнительные CSS-классы для кастомизации отступов или позиционирования.
   * @default ""
   */
  className?: string;
}

/**
 * Компонент иконки с наложенным индикатором действия (плюс или крестик).
 * Используется для визуального обозначения возможности добавления или удаления элемента.
 * 
 * Основная иконка отображается центрированно, а в правом верхнем углу поверх неё
 * размещается маленький круглый бейдж с соответствующим символом:
 * - Зелёный `+` при `mode="add"`.
 * - Красный `×` при `mode="remove"`.
 * 
 * Бейдж автоматически масштабируется пропорционально размеру основной иконки.
 * Подходит для использования в кнопках, выпадающих меню и других интерактивных элементах.
 * 
 * @component
 * @param props - Свойства компонента {@link ActionIconProps}.
 * 
 * @example
 * <Fb2ActionIcon icon={Quote} mode="add" />
 * 
 * @example
 * <Fb2ActionIcon icon={List} mode="remove" size={24} className="ml-2" />
 */
export const Fb2ActionIcon = ({ 
  icon: Icon, 
  mode, 
  size = 20, 
  className = "" 
}: ActionIconProps) => {
  const isAdd = mode === 'add'
  const badgeSize = Math.round(size / 2) // Динамический размер бейджа

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Основная иконка */}
      <Icon size={size} strokeWidth={2} className="opacity-80" />
      
      {/* Бейдж-индикатор */}
      <div 
        className={`
          absolute -top-1 -right-1.5
          rounded-full ring-2 ring-white
          flex items-center justify-center
          ${isAdd ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
        `}
        style={{ width: badgeSize, height: badgeSize }}
      >
        {isAdd 
          ? <Plus size={badgeSize - 2} strokeWidth={4} /> 
          : <X size={badgeSize - 2} strokeWidth={4} />
        }
      </div>
    </div>
  )
}
