import { Heading1, Plus, X } from 'lucide-react'

export const TitleIcon = ({ mode }: { mode: 'add' | 'remove' }) => {
  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Основная иконка заголовка */}
      <Heading1 size={20} strokeWidth={2.5} />
      
      {/* Бейдж в углу */}
      <div className={`
        absolute -top-1 -right-2 
        rounded-full border-2 border-white bg-white
        flex items-center justify-center
        ${mode === 'add' ? 'text-green-600' : 'text-red-500'}
      `}>
        {mode === 'add' 
          ? <Plus size={10} strokeWidth={4} /> 
          : <X size={10} strokeWidth={4} />
        }
      </div>
    </div>
  )
}
