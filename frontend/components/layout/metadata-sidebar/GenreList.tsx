import React, { useState, useMemo, useRef } from 'react';
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
        onOpenChange: setIsAdding,
        placement: 'bottom-start',
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

    const handleSelect = (genreId: string) => {
        onUpdate([...genres, genreId]);
        setSearchFilter('');
        setIsAdding(false);
        setActiveIndex(0);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchFilter(e.target.value);
        setActiveIndex(0); // Сбрасываем индекс здесь, без лишних рендеров
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

    return (
        <div className="flex flex-wrap gap-1.5 min-h-8 items-center">
            {/* Теги выбранных жанров */}
            {genres.map((id, idx) => (
                <div
                    key={id}
                    title={getLabel(id)}
                    className="flex items-center gap-1.5 px-2 py-1 bg-[var(--color-ui-accent)]/10 border border-[var(--color-ui-accent)]/20 rounded text-[10px] font-mono text-[var(--color-ui-accent)] font-medium group transition-all cursor-help"
                >
                    <span>{id}</span>
                    <button
                        type="button"
                        aria-label={`Удалить ${getLabel(id)}`}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            onUpdate(genres.filter((_, i) => i !== idx));
                        }}
                        className="text-[var(--color-ui-accent)]/50 hover:text-red-500 transition-colors"
                    >
                        <X size={10} strokeWidth={3} />
                    </button>
                </div>
            ))}

            {isAdding ? (
                <div className="relative inline-block">
                    <div className="relative flex items-center" ref={(node) => { refs.setReference(node); }}>
                        <input
                            autoFocus
                            type="text"
                            placeholder="Название или код..."
                            /* Инпут в стиле темы */
                            className="text-[11px] pl-7 pr-2 py-1.5 bg-[var(--color-ui-bg)] border-2 border-[var(--color-ui-accent)] text-[var(--color-ui-text)] rounded-md outline-none w-56 shadow-[var(--shadow-dropdown)] transition-colors placeholder:text-[var(--color-ui-text-muted)]/50"
                            value={searchFilter}
                            onChange={handleSearchChange}
                            onKeyDown={handleKeyDown}
                            onBlur={() => {
                                requestAnimationFrame(() => setIsAdding(false));
                            }}
                        />
                        <Search size={12} className="absolute left-2.5 text-[var(--color-ui-accent)]" />
                    </div>

                    {searchFilter && (
                        <FloatingPortal>
                            <div
                                ref={(node) => { refs.setFloating(node); }}
                                style={{
                                    ...floatingStyles,
                                    display: isPositioned ? 'block' : 'none',
                                }}
                                /* Выпадающий список в стиле Paper */
                                className="z-[9999] bg-[var(--color-paper-bg)] border border-[var(--color-ui-border)] rounded-lg shadow-[var(--shadow-dropdown)] overflow-hidden min-w-[224px] animate-in fade-in duration-100"
                            >
                                <div title="Поиск жанра" ref={listRef} className="max-h-52 overflow-y-auto scrollbar-hide">
                                    {filteredOptions.map((g, index) => (
                                        <div
                                            key={g.id}
                                            onMouseDown={(e) => { e.preventDefault(); handleSelect(g.id); }}
                                            onMouseEnter={() => setActiveIndex(index)}
                                            /* Активный элемент подсвечивается акцентом темы */
                                            className={`group flex flex-col px-3 py-2 cursor-pointer border-b border-[var(--color-ui-border)]/30 last:border-0 transition-colors ${index === activeIndex
                                                    ? 'bg-[var(--color-ui-accent)] text-[var(--color-ui-accent-foreground)]'
                                                    : 'hover:bg-[var(--color-ui-bg-hover)]'
                                                }`}
                                        >
                                            <span className={`text-[11px] font-semibold ${index === activeIndex ? 'text-[var(--color-ui-accent-foreground)]' : 'text-[var(--color-ui-text)]'}`}>
                                                {g.label}
                                            </span>
                                            <span className={`text-[9px] font-mono leading-none ${index === activeIndex ? 'opacity-80' : 'text-[var(--color-ui-text-muted)]'}`}>
                                                {g.id}
                                            </span>
                                        </div>
                                    ))}
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
                    className="flex items-center gap-1 px-2 py-1 border border-dashed border-[var(--color-ui-border)] rounded text-[11px] text-[var(--color-ui-text-muted)] hover:border-[var(--color-ui-accent)] hover:text-[var(--color-ui-accent)] transition-all"
                >
                    <Plus size={10} />
                    <span>Добавить</span>
                </button>
            )}
        </div>
    );

};