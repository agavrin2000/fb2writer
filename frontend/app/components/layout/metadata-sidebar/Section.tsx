import React, { ReactNode, ElementType } from 'react';
import { ChevronDown } from 'lucide-react';

interface SectionProps {
    title: string;
    icon?: ElementType; // Тип для иконок lucide-react
    children: ReactNode;
    className?: string;
    defaultOpen?: boolean;
}

export const Section = ({
    title,
    icon: Icon,
    children,
    className = "",
    defaultOpen = true
}: SectionProps) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);
    // Генерируем уникальный ID для связи кнопки и контента
    const contentId = React.useId();

    return (
        <div className={`border border-gray-200 rounded-lg bg-white shadow-sm ${className}`}>
            <button 
                type="button"
                aria-controls={contentId}
                onClick={() => setIsOpen(!isOpen)}
                // Добавляем rounded-t-lg, чтобы фон при ховере не вылезал за скругление
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon size={14} className="text-blue-500" />}
                    <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">{title}</h3>
                </div>
                <ChevronDown
                    size={14}
                    className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            <div 
                id={contentId}
                role="region"
                className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
            >
                {/* overflow-hidden здесь обязателен для работы grid-анимации */}
                <div className="overflow-hidden">
                    <div className="p-3 border-t border-gray-100">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

