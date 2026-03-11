'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { TocItem } from '../../types/types';

export const Sidebar = ({ tree, onNavigate, activePos }: { tree: TocItem[], onNavigate: (pos: number) => void, activePos: number | null }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    // Функция для переключения (можно вызвать горячей клавишей Alt+B)
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const renderTocBranch = (items: TocItem[]) => {
        if (!items || items.length === 0) return null;
        return items.map((item) => (
            <div key={item.pos} className="flex flex-col">
                <button type="button"
                    id={`toc-item-${item.pos}`}
                    onClick={() => onNavigate(item.pos)}
                    className={`w-full text-left px-3 py-2 text-[11px] rounded transition-all truncate border-l-4 mb-0.5 ${activePos === item.pos
                        ? 'bg-blue-600 text-white border-blue-900 font-bold'
                        : 'text-gray-600 border-transparent hover:bg-gray-100'
                        }`}
                    // Умножаем отступ на уровень, чтобы видеть иерархию
                    style={{ paddingLeft: `${item.level * 10}px` }}
                >
                    {item.text}
                </button>
                {item.children.length > 0 && renderTocBranch(item.children)}
            </div>
        ));
    };

    return (
        <>
            {isSidebarOpen && (
                <aside className="w-72 flex-none border-r bg-white flex flex-col shadow-xl z-10 animate-in slide-in-from-left duration-200">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Структура книги</span>
                        <button onClick={toggleSidebar} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    <div className="flex-grow overflow-y-auto p-3 space-y-0.5 custom-scrollbar">
                        {renderTocBranch(tree)}
                    </div>
                </aside>
            )}
        </>
    );
};
