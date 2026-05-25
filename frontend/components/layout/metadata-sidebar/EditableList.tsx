import React, { useState } from 'react';
import { Mail, Plus, X } from 'lucide-react';

/**
 * Интерфейс свойств компонента EditableList.
 */
interface EditableListProps {
    /**
     * Заголовок списка (например, "Email", "Домашняя страница").
     */
    label: string;

    /**
     * Массив строк, представляющих текущие элементы списка (например, email-адреса).
     */
    items: string[];

    /**
     * Функция обратного вызова, вызываемая при изменении списка.
     *
     * @param newItems - Новый массив строк после добавления, удаления или редактирования.
     * @param immediate - Опциональный флаг, указывающий, нужно ли обновлять данные немедленно.
     */
    onUpdate: (newItems: string[], immediate?: boolean) => void;

    /**
     * Иконка, отображаемая рядом с каждым полем ввода.
     * По умолчанию — `Mail`.
     */
    icon?: React.ElementType;

    /**
     * Текст-заполнитель для поля ввода нового элемента.
     * По умолчанию — `"email@example.com"`.
     */
    placeholder?: string;
}

/**
 * Компонент редактируемого списка строковых значений.
 *
 * Предоставляет интерфейс для:
 * - Отображения и редактирования существующих элементов списка.
 * - Добавления новых элементов с помощью кнопки или клавиши Enter.
 * - Удаления элементов по клику на иконку крестика.
 * - Валидации пустых значений при добавлении.
 *
 * Используется, например, для управления списками email-адресов или домашних страниц в метаданных FB2.
 *
 * @param label - Заголовок секции списка.
 * @param items - Текущий массив строк.
 * @param onUpdate - Функция для уведомления родительского компонента об изменениях.
 * @param icon - Иконка, отображаемая слева от каждого поля (по умолчанию `Mail`).
 * @param placeholder - Текст-заполнитель для поля ввода нового элемента.
 * @returns React-компонент в виде списка полей с возможностью добавления.
 *
 * @example
 * ```tsx
 * <EditableList
 *   label="Email"
 *   items={emails}
 *   onUpdate={(newEmails) => setEmails(newEmails)}
 *   placeholder="user@example.com"
 * />
 * ```
 */
export const EditableList = ({ 
    label, 
    items = [], 
    onUpdate, 
    icon: Icon = Mail, 
    placeholder = "email@example.com" 
}: EditableListProps) => {
    const [newItem, setNewItem] = useState('');

    /**
     * Добавляет новый элемент в список.
     * Предотвращает добавление пустых или состоящих из пробелов значений.
     *
     * @param e - Событие формы (опционально, может быть вызвано без события).
     */
    const addItem = (e?: React.BaseSyntheticEvent) => {
        e?.preventDefault();
        const value = newItem.trim();
        if (value) {
            onUpdate([...items, value], true);
            setNewItem('');
        }
    };

    /**
     * Обрабатывает нажатие клавиш в поле ввода.
     * При нажатии Enter вызывает добавление нового элемента.
     *
     * @param e - Клавиатурное событие.
     */
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            addItem(e);
        }
    };

    /**
     * Удаляет элемент из списка по его индексу.
     *
     * @param index - Индекс удаляемого элемента.
     */
    const removeItem = (index: number) => {
        onUpdate(items.filter((_, i) => i !== index), true);
    };

    /**
     * Обновляет значение конкретного элемента по индексу.
     *
     * @param index - Индекс редактируемого элемента.
     * @param value - Новое значение.
     */
    const updateItem = (index: number, value: string) => {
        const updated = [...items];
        updated[index] = value;
        onUpdate(updated);
    };

    return (
        <div>
            {/* Заголовок секции */}
            <span className="text-[10px] font-bold text-ui-text-muted uppercase tracking-tight">
                {label}
            </span>

            <div className="space-y-1">
                {items.map((item, idx) => (
                    <div
                        key={`${idx}-${item}`}
                        className="group flex items-center gap-2 bg-ui-bg border border-ui-border rounded px-2 py-1 transition-all hover:border-ui-accent focus-within:border-ui-accent"
                    >
                        <Icon size={12} className="text-ui-text-muted shrink-0" />
                        <input
                            className="grow bg-transparent text-[11px] text-ui-text outline-none focus:text-ui-accent"
                            value={item}
                            onChange={(e) => updateItem(idx, e.target.value)}
                            placeholder={placeholder}
                        />
                        <button
                            type="button"
                            title="Удалить"
                            onClick={() => removeItem(idx)}
                            className="text-ui-text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 group-focus-within:opacity-100"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Поле добавления */}
            <div className="flex items-center gap-2 mt-2">
                <input
                    className="grow bg-paper-bg border border-dashed border-ui-border rounded px-2 py-1 text-[11px] text-ui-text outline-none focus:border-ui-accent focus:border-solid transition-all placeholder:text-ui-text-muted/50"
                    placeholder={placeholder}
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button
                    type="button"
                    title="Добавить"
                    onClick={addItem}
                    disabled={!newItem.trim()}
                    /* Используем акцентный цвет для кнопки добавления */
                    className="p-1 bg-ui-accent text-ui-accent-foreground rounded enabled:hover:opacity-90 disabled:opacity-30 disabled:grayscale transition-all"
                >
                    <Plus size={14} />
                </button>
            </div>
        </div>
    );
};