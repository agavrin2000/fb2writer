'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { TocItem } from '../../types/types';
import { ChevronRight, ChevronLeft, Strikethrough, Code, Quote, Superscript, Subscript, FileImage } from 'lucide-react';

export const Sidebar = ({ tree, onNavigate, activePos }: { tree: TocItem[], onNavigate: (pos: number) => void, activePos: number | null }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    // Функция для переключения (можно вызвать горячей клавишей Alt+B)
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const renderTocBranch = (items: TocItem[], level = 0) => {
        if (!items || items.length === 0) return null;
        
        return (
            // Контейнер для дочерних элементов с отступом и линией слева
            <div className={`relative ${level > 0 ? 'ml-4 border-l border-gray-200' : ''}`}>
                {items.map((item, index) => (
                    <div key={item.pos} className="relative flex flex-col">
                        {/* Горизонтальная линия-отвод к пункту (кроме самого корня) */}
                        {level > 0 && (
                            <div className="absolute left-0 top-4 w-3 border-t border-gray-200" />
                        )}
                        
                        <button
                            type="button"
                            id={`toc-item-${item.pos}`}
                            onClick={() => onNavigate(item.pos)}
                            className={`relative z-10 w-full text-left px-3 py-1.5 text-[11px] rounded transition-all truncate mb-0.5 ml-3 ${
                                activePos === item.pos
                                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {item.text}
                        </button>

                        {/* Рекурсивный вызов для детей */}
                        {item.children.length > 0 && renderTocBranch(item.children, level + 1)}
                        
                        {/* "Заглушка", чтобы линия не тянулась ниже последнего элемента в ветке */}
                        {index === items.length - 1 && level > 0 && (
                             <div className="absolute left-[-1px] top-4 bottom-0 w-1 bg-white" />
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="relative flex h-full">
            {/* Кнопка открытия (Плавающая). Показывается ТОЛЬКО когда закрыто */}
            {!isSidebarOpen && (
                <button 
                    onClick={toggleSidebar}
                    className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-white border border-gray-200 border-l-0 p-2 rounded-r-xl shadow-lg hover:bg-blue-50 text-blue-600 transition-[width,opacity] animate-in slide-in-from-left duration-100 ease-out"
                    title="Открыть меню"
                >
                    <ChevronRight size={20} strokeWidth={3} />
                </button>
            )}

            {/* Основной контейнер сайдбара */}
            <aside className={`
                relative flex flex-col border-r bg-white shadow-xl z-40 
                ${isSidebarOpen ? 'w-72 opacity-100' : 'w-0 opacity-0 overflow-hidden'}
            `}>
                {/* Шапка с кнопкой закрытия */}
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center min-w-[288px]">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Структура</span>
                    <button type='button' title='Структура'
                        onClick={toggleSidebar} 
                        className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                         <ChevronLeft size={18} />
                    </button>
                </div>
                
                {/* Контент (дерево) */}
                <div className="flex-grow overflow-y-auto p-4 custom-scrollbar min-w-[288px]">
                    { renderTocBranch(tree) }
                </div>
            </aside>
        </div>
    );
};
