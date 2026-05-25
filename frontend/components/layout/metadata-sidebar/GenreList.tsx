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

/**
 * Интерфейс жанра.
 */
interface Genre {
    /**
     * Уникальный код жанра (например, "sf_space").
     */
    id: string;

    /**
     * Отображаемое название жанра (например, "Космическая фантастика").
     */
    label: string;
}

/**
 * Свойства компонента GenreList.
 */
interface GenreListProps {
    /**
     * Массив выбранных идентификаторов жанров.
     */
    genres: string[];

    /**
     * Функция обратного вызова, вызываемая при изменении списка жанров.
     *
     * @param newGenres - Новый массив кодов жанров.
     */
    onUpdate: (newGenres: string[]) => void;

    /**
     * Полный список доступных жанров для выбора.
     */
    availableGenres: Genre[];
}

/**
 * Компонент для управления списком жанров в метаданных FB2-книги.
 *
 * Предоставляет интерфейс для:
 * - Отображения выбранных жанров в виде тегов.
 * - Добавления новых жанров через выпадающий список с поиском по названию или коду.
 * - Удаления жанров по клику на крестик.
 * - Навигации по результатам поиска с помощью клавиш со стрелками и Enter.
 *
 * Выпадающий список позиционируется динамически с помощью библиотеки `@floating-ui/react`.
 *
 * @param genres - Текущий массив кодов выбранных жанров.
 * @param onUpdate - Функция для обновления родительского состояния.
 * @param availableGenres - Полный справочник всех возможных жанров.
 * @returns React-компонент в виде строки с тегами и интерактивным полем добавления.
 *
 * @example
 * ```tsx
 * <GenreList
 *   genres={selectedGenres}
 *   onUpdate={setSelectedGenres}
 *   availableGenres={allGenres}
 * />
 * ```
 */
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

    /**
     * Возвращает отображаемое имя жанра по его коду.
     *
     * @param id - Код жанра.
     * @returns Название жанра или сам код, если не найден.
     */
    const getLabel = (id: string) => availableGenres.find(g => g.id === id)?.label || id;

    /**
     * Фильтрует доступные жанры на основе текущего поискового запроса.
     * Исключает уже выбранные жанры и ограничивает результат первыми 10 совпадениями.
     *
     * @returns Отфильтрованный массив жанров.
     */
    const filteredOptions = useMemo(() => {
        const lowerTerm = searchFilter.toLowerCase();
        return availableGenres.filter(g =>
            !genres.includes(g.id) &&
            (g.label.toLowerCase().includes(lowerTerm) || g.id.toLowerCase().includes(lowerTerm))
        ).slice(0, 10);
    }, [genres, searchFilter, availableGenres]);

    /**
     * Добавляет новый жанр в список.
     *
     * @param genreId - Код добавляемого жанра.
     */
    const handleSelect = (genreId: string) => {
        onUpdate([...genres, genreId]);
        setSearchFilter('');
        setIsAdding(false);
        setActiveIndex(0);
    };

    /**
     * Обрабатывает изменение текста в поле поиска.
     *
     * @param e - Событие изменения поля ввода.
     */
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchFilter(e.target.value);
        setActiveIndex(0); // Сбрасываем индекс при каждом изменении
    };

    /**
     * Обрабатывает нажатие клавиш в поле поиска.
     * Поддерживает навигацию (стрелки), выбор (Enter) и отмену (Escape).
     *
     * @param e - Клавиатурное событие.
     */
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
                                className="z-[9999] bg-[var(--color-paper-bg)] border border-[var(--color-ui-border)] rounded-lg shadow-[var(--shadow-dropdown)] overflow-hidden min-w-[224px] animate-in fade-in duration-100"
                            >
                                <div title="Поиск жанра" ref={listRef} className="max-h-52 overflow-y-auto scrollbar-hide">
                                    {filteredOptions.map((g, index) => (
                                        <div
                                            key={g.id}
                                            onMouseDown={(e) => { e.preventDefault(); handleSelect(g.id); }}
                                            onMouseEnter={() => setActiveIndex(index)}
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