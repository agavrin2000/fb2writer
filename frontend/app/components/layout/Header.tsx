'use client';
import React, { useEffect, useState, useRef, memo } from 'react';
import { Editor } from '@tiptap/react';
import { Info, LogOut, Save, FolderOpen, Undo, Redo, FileCode, FilePlus } from 'lucide-react';
import { AboutModal } from './AboutModal';
import { ExitModal } from './ExitModal';
import { photino } from '@/api/photino';

export const Header = memo(({
    editor,
    onSave,
    onOpen,
    onNew,
    fileName
}: {
    editor: Editor | null,
    onSave: (saveAs: boolean) => void,
    onOpen: () => void,
    onNew: () => void,
    fileName: string
}) => {
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [isAboutOpen, setIsAboutOpen] = useState(false);
    const [isExitModalOpen, setIsExitModalOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Закрытие меню при клике вне
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAction = (action: () => void) => {
        action();
        setActiveMenu(null);
    };

    const menuBtnClass = (name: string) => `px-3 py-1 text-sm rounded transition-colors ${activeMenu === name ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'}`;
    const dropdownClass = "absolute top-full left-0 w-64 bg-white shadow-2xl border border-gray-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-75";
    const itemClass = "w-full text-left px-4 py-1.5 hover:bg-indigo-600 hover:text-white flex justify-between items-center text-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-current";

    return (
        <>
            <header className="h-9 bg-white border-b flex items-center px-2 z-50 shadow-sm select-none">
                <div className="flex items-center gap-1" ref={menuRef}>

                    {/* РАЗДЕЛ: ФАЙЛ */}
                    <div className="relative">
                        <button type='button' onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')} className={menuBtnClass('file')}>
                            Файл
                        </button>
                        {activeMenu === 'file' && (
                            <div className={dropdownClass}>
                                <button type="button" onClick={() => handleAction(onNew)} className={itemClass}>
                                    <span className="flex items-center gap-2"><FilePlus  size={14} /> Новый</span>
                                    <span className="text-[10px] opacity-50">Ctrl+N</span>
                                </button>
                                <button type="button" onClick={() => handleAction(onOpen)} className={itemClass}>
                                    <span className="flex items-center gap-2"><FolderOpen size={14} /> Открыть...</span>
                                    <span className="text-[10px] opacity-50">Ctrl+O</span>
                                </button>
                                <button type="button" onClick={() => handleAction(() => onSave(false))} className={itemClass}>
                                    <span className="flex items-center gap-2"><Save size={14} /> Сохранить</span>
                                    <span className="text-[10px] opacity-50">Ctrl+S</span>
                                </button>
                                <button type="button" onClick={() => handleAction(() => onSave(true))} className={itemClass}>
                                    <span className="flex items-center gap-2"><FileCode size={14} /> Сохранить как...</span>
                                    <span className="text-[10px] opacity-50">Ctrl+Shift+S</span>
                                </button>
                                <div className="border-t my-1"></div>
                                <button type="button" onClick={() => handleAction(() => setIsExitModalOpen(true))} className={`${itemClass} text-red-600`}>
                                    <span className="flex items-center gap-2"><LogOut size={14} /> Выход</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* РАЗДЕЛ: ПРАВКА */}
                    <div className="relative">
                        <button type='button' onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')} className={menuBtnClass('edit')}>
                            Правка
                        </button>
                        {activeMenu === 'edit' && (
                            <div className={dropdownClass}>
                                <button
                                    type="button"
                                    disabled={!editor?.can().undo()}
                                    onClick={() => handleAction(() => editor?.chain().focus().undo().run())}
                                    className={itemClass}
                                >
                                    <span className="flex items-center gap-2"><Undo size={14} /> Отменить</span>
                                    <span className="text-[10px] opacity-50">Ctrl+Z</span>
                                </button>
                                <button
                                    type="button"
                                    disabled={!editor?.can().redo()}
                                    onClick={() => handleAction(() => editor?.chain().focus().redo().run())}
                                    className={itemClass}
                                >
                                    <span className="flex items-center gap-2"><Redo size={14} /> Повторить</span>
                                    <span className="text-[10px] opacity-50">Ctrl+Y</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* РАЗДЕЛ: СПРАВКА */}
                    <div className="relative">
                        <button type='button' onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')} className={menuBtnClass('help')}>
                            Справка
                        </button>
                        {activeMenu === 'help' && (
                            <div className={dropdownClass}>
                                <button type="button" onClick={() => handleAction(() => setIsAboutOpen(true))} className={itemClass}>
                                    <span className="flex items-center gap-2"><Info size={14} /> О программе</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-grow text-center text-[10px] font-black text-gray-300 tracking-[0.4em] uppercase truncate px-4">
                    {!fileName ? "FB2 Editor" : fileName}
                </div>
            </header>

            <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
            <ExitModal
                isOpen={isExitModalOpen}
                onClose={() => setIsExitModalOpen(false)}
                onConfirm={() => photino.send('close-app')}
            />
        </>
    );
});
