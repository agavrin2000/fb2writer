'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Editor } from '@tiptap/react';

export const Header = ({ editor, onSave, onOpen }: { editor: Editor | null, onSave: () => void, onOpen: () => void }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    return (
            <header className="h-9 bg-white border-b flex items-center px-4 z-50 shadow-sm select-none">
                <div className="relative">
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`px-3 py-1 text-sm rounded ${isMenuOpen ? 'bg-gray-100' : ''}`}>Файл</button>
                    {isMenuOpen && (
                        <div className="absolute top-full left-0 w-64 bg-white shadow-2xl border border-gray-200 py-1 z-50">
                            <button onClick={onOpen/*setIsMenuOpen(false);*/} className="w-full text-left px-4 py-2 hover:bg-blue-600 hover:text-white flex justify-between text-sm"><span>Открыть...</span><span className="text-gray-400">CTRL+O</span></button>
                            <button onClick={onSave/*setIsMenuOpen(false);*/} className="w-full text-left px-4 py-2 hover:bg-blue-600 hover:text-white flex justify-between text-sm"><span>Сохранить</span><span className="text-gray-400">CTRL+S</span></button>
                        </div>
                    )}
                </div>
                <div className="flex-grow text-center text-[10px] font-black text-gray-300 tracking-[0.4em] uppercase">FB2 Hierarchical Studio</div>
            </header>
    );
};


