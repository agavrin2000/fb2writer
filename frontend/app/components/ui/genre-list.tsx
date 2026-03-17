import React, { useState } from 'react';
import { Tag, Plus, X } from 'lucide-react';
import { Section } from './section';

interface GenreListProps {
    genres: string[];
    onUpdate: (newGenres: string[]) => void;
    availableGenres: string[]; 
}

export const GenreList = ({ genres = [], onUpdate, availableGenres = [] }: GenreListProps) => {
    const [isAdding, setIsAdding] = useState(false);

    const removeGenre = (index: number) => {
        onUpdate(genres.filter((_, i) => i !== index));
    };

    const addGenre = (genreCode: string) => {
        if (genreCode && !genres.includes(genreCode)) {
            onUpdate([...genres, genreCode]);
        }
        setIsAdding(false);
    };

    return (
            <div className="flex flex-wrap gap-1.5 min-h-8 items-center">
                {genres.map((genre, idx) => (
                    <div 
                        key={idx} 
                        className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-100 rounded text-[11px] text-blue-700 font-medium group animate-in zoom-in-95 duration-200"
                    >
                        <span>{genre}</span>
                        <button 
                            type="button"
                            onClick={() => removeGenre(idx)}
                            className="text-blue-300 hover:text-red-500 transition-colors"
                            title="Удалить жанр"
                        >
                            <X size={10} strokeWidth={3} />
                        </button>
                    </div>
                ))}

                {isAdding ? (
                    <select
                        title="Выбрать жанр" 
                        autoFocus
                        className="text-[11px] px-2 py-1 border border-blue-400 rounded outline-none bg-white shadow-sm animate-in fade-in duration-200"
                        onBlur={() => setIsAdding(false)}
                        onChange={(e) => addGenre(e.target.value)}
                        defaultValue=""
                    >
                        <option value="" disabled>Выбрать жанр...</option>
                        {availableGenres
                            .filter(g => !genres.includes(g)) // Убираем уже выбранные
                            .map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))
                        }
                    </select>
                ) : (
                    <button 
                        type="button"
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-1 px-2 py-1 border border-dashed border-gray-300 rounded text-[11px] text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-all"
                    >
                        <Plus size={10} />
                        <span>Добавить</span>
                    </button>
                )}
            </div>
    );
};
