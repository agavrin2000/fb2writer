'use client';
import React, { useEffect, useState, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { X, Info, LogOut } from 'lucide-react'; // Импортируем иконки
import { AboutModal } from './AboutModal';
import { ExitModal } from './ExitModal';
import { photino } from '@/api/photino'; 

export const Header = ({ editor, onSave, onOpen }: { editor: Editor | null, onSave: () => void, onOpen: () => void }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAboutOpen, setIsAboutOpen] = useState(false); // Стейт для модалки
    const [isExitModalOpen, setIsExitModalOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAction = (action: () => void) => {
        action();
        setIsMenuOpen(false);
    };

    const handleExitConfirm = () => {
        photino.send('close-app');
    };
    // Функция выхода (например, закрытие окна или редирект)
    const handleExit = () => {
        if (confirm("Вы уверены, что хотите выйти? Несохраненные данные могут быть потеряны.")) {
            window.close(); // Работает, если окно было открыто скриптом, иначе можно редирект
        }
    };

    return (
        <>
            <header className="h-9 bg-white border-b flex items-center px-4 z-50 shadow-sm select-none">
                <div className="relative" ref={menuRef}>
                    <button type='button' onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`px-3 py-1 text-sm rounded transition-colors ${isMenuOpen ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
                        Файл
                    </button>

                    {isMenuOpen && (
                        <div className="absolute top-full left-0 w-64 bg-white shadow-2xl border border-gray-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                            <button type='button' onClick={() => handleAction(onOpen)} className="w-full text-left px-4 py-2 hover:bg-blue-600 hover:text-white flex justify-between text-sm">
                                <span>Открыть...</span><span className="text-gray-400 group-hover:text-blue-200">CTRL+O</span>
                            </button>
                            <button type='button' onClick={() => handleAction(onSave)} className="w-full text-left px-4 py-2 hover:bg-blue-600 hover:text-white flex justify-between text-sm">
                                <span>Сохранить</span><span className="text-gray-400">CTRL+S</span>
                            </button>

                            <div className="border-t my-1"></div>

                            {/* Кнопка О программе */}
                            <button type='button' onClick={() => handleAction(() => setIsAboutOpen(true))} className="w-full text-left px-4 py-2 hover:bg-blue-600 hover:text-white flex items-center gap-2 text-sm">
                                <Info size={14} /> <span>О программе</span>
                            </button>

                            {/* Кнопка Выход */}
                            <button type='button' onClick={() => handleAction(() => setIsExitModalOpen(true))} className="w-full text-left px-4 py-2 hover:bg-red-600 hover:text-white flex items-center gap-2 text-sm text-red-600">
                                <LogOut size={14} /> <span>Выход</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-grow text-center text-[10px] font-black text-gray-300 tracking-[0.4em] uppercase">FB2 Editor</div>
            </header>
            <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
            <ExitModal
                isOpen={isExitModalOpen}
                onClose={() => setIsExitModalOpen(false)}
                onConfirm={handleExitConfirm}
            />
        </>
    );
};
