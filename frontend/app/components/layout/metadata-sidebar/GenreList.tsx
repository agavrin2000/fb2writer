import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, X, Search } from 'lucide-react';
import {
    useFloating,
    offset,
    flip,
    shift,
    autoUpdate,
    FloatingPortal
} from '@floating-ui/react';

interface Genre {
    id: string;    // Код: "sf_space"
    label: string; // Текст: "Космическая фантастика"
}

interface GenreListProps {
    genres: string[]; // Выбранные коды
    onUpdate: (newGenres: string[]) => void;
    availableGenres: Genre[]; // Весь справочник
}

export const GenreList = ({ genres = [], onUpdate, availableGenres = [] }: GenreListProps) => {
    const [isAdding, setIsAdding] = useState(false);
    const [searchFilter, setSearchFilter] = useState('');
    const [activeIndex, setActiveIndex] = useState(0); // Индекс активного элемента для стрелок
    const listRef = useRef<HTMLDivElement>(null);

    const { refs, floatingStyles, isPositioned } = useFloating({
        open: isAdding && searchFilter.length > 0,
        placement: 'bottom-start',
        strategy: 'fixed', // Важно: фиксированное позиционирование для порталов
        whileElementsMounted: autoUpdate,
        middleware: [
            offset(4),
            flip({ fallbackAxisSideDirection: 'end' }),
            shift()
        ],
    });
    const getLabel = (id: string) => availableGenres.find(g => g.id === id)?.label || id;

    // Расширенная фильтрация (по label и по id)
    const filteredOptions = useMemo(() => {
        const lowerTerm = searchFilter.toLowerCase();
        return availableGenres.filter(g =>
            !genres.includes(g.id) &&
            (g.label.toLowerCase().includes(lowerTerm) || g.id.toLowerCase().includes(lowerTerm))
        ).slice(0, 10);
    }, [genres, searchFilter, availableGenres]);

    // Сбрасываем индекс при изменении поиска
    //   useEffect(() => setActiveIndex(0), [searchTerm]);

    // 1. Добавляем стейт для отслеживания предыдущего поискового запроса
    const [prevFilter, setPrevFilter] = useState(searchFilter);
    if (searchFilter !== prevFilter) {
        setPrevFilter(searchFilter);
        setActiveIndex(0);
    }
    const handleSelect = (genreId: string) => {
        if (!genreId) return;
        onUpdate([...genres, genreId]);
        setSearchFilter('');
        setIsAdding(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredOptions[activeIndex]) {
                handleSelect(filteredOptions[activeIndex].id);
            }
        } else if (e.key === 'Escape') {
            setIsAdding(false);
        }
    };

    useEffect(() => {
        if (isAdding && listRef.current) {
            const activeItem = listRef.current.children[activeIndex] as HTMLElement;
            if (activeItem) {
                activeItem.scrollIntoView({
                    block: 'nearest', // Прокрутит только если элемент скрыт
                    behavior: 'smooth' // Сделает это плавно
                });
            }
        }
    }, [activeIndex, isAdding]);

    return (
        <div className="flex flex-wrap gap-1.5 min-h-8 items-center">
            {/* Теги выбранных жанров */}
            {genres.map((id, idx) => (
                <div
                    key={id}
                    // Добавляем title на весь контейнер тега, чтобы название всплывало везде
                    title={getLabel(id)}
                    className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-100 rounded text-[10px] font-mono text-blue-700 font-medium group transition-all cursor-help"
                >
                    <span>{id}</span>
                    <button
                        type="button"
                        aria-label={`Удалить ${getLabel(id)}`}
                            onMouseDown={(e) => {
                            e.preventDefault(); // Чтобы не терять фокус, если инпут открыт
                            onUpdate(genres.filter((_, i) => i !== idx));
                        }}
                        className="text-blue-300 hover:text-red-500 transition-colors"
                    >
                        <X size={10} strokeWidth={3} />
                    </button>
                </div>
            ))}

            {isAdding ? (
                <div className="relative inline-block">
                    <div className="relative flex items-center" ref={(node) => {
                        refs.setReference(node);
                    }}>
                        <input
                            autoFocus
                            type="text"
                            placeholder="Название или код..."
                            className="text-[11px] pl-7 pr-2 py-1.5 border-2 border-blue-400 rounded-md outline-none w-56 shadow-sm"
                            defaultValue=""
                            onChange={(e) => setSearchFilter(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={() => setTimeout(() => setIsAdding(false), 200)}
                        />
                        <Search size={12} className="absolute left-2.5 text-blue-500" />
                    </div>

                    {searchFilter && (
                        <FloatingPortal>
                            <div
                                ref={(node) => { refs.setFloating(node); }}
                                style={{
                                    ...floatingStyles,
                                    // Если позиция 0,0 — принудительно скрываем, чтобы не было вспышки в углу
                                    display: isPositioned ? 'block' : 'none',
                                }}
                                className="z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden min-w-[224px] animate-in fade-in duration-100"
                            >
                                <div ref={listRef} className="max-h-52 overflow-y-auto scrollbar-hide">
                                    {filteredOptions.length > 0 ? (
                                        filteredOptions.map((g, index) => (
                                            <div
                                                key={g.id}
                                                onMouseDown={(e) => { e.preventDefault(); handleSelect(g.id); }}
                                                onMouseEnter={() => setActiveIndex(index)}
                                                className={`group flex flex-col px-3 py-2 cursor-pointer border-b border-gray-50 last:border-0 transition-colors ${index === activeIndex ? 'bg-blue-600' : 'hover:bg-blue-50'
                                                    }`}
                                            >
                                                <span className={`text-[11px] font-semibold ${index === activeIndex ? 'text-white' : 'text-gray-700'
                                                    }`}>
                                                    {g.label}
                                                </span>
                                                <span className={`text-[9px] font-mono leading-none ${index === activeIndex ? 'text-blue-100' : 'text-gray-400'
                                                    }`}>
                                                    {g.id}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-3 py-4 text-center text-[11px] text-gray-400">Не найдено</div>
                                    )}
                                </div>
                            </div>
                        </FloatingPortal>
                    )}
                </div>
            ) : (
                <button
                    type="button"
                    aria-label="Добавить жанр"
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-1 px-2 py-1 border border-dashed border-gray-300 rounded text-[11px] text-gray-400 hover:border-blue-400 hover:text-blue-500"
                >
                    <Plus size={10} />
                    <span>Добавить</span>
                </button>
            )}
        </div>
    );
};
