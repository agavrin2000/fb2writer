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

    return (
        <div className={`border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm ${className}`}>
            <button type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
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

            <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-250 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                <div className="p-3 border-t border-gray-100">
                    {children}
                </div>
            </div>
        </div>
    );
};
