import { LucideIcon, Plus, X } from 'lucide-react'

interface ActionIconProps {
  icon: LucideIcon       // Основная иконка (ALargeSmall, Quote и т.д.)
  mode: 'add' | 'remove' // Режим: плюс или крестик
  size?: number          // Размер основной иконки (по умолчанию 20)
  className?: string     // Для кастомных отступов
}

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
