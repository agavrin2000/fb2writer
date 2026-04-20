import React, { useState } from 'react';
import { Mail, Plus, X } from 'lucide-react';

interface EditableListProps {
    label: string;
    items: string[];
    onUpdate: (newItems: string[], immediate?: boolean) => void;
    icon?: React.ElementType;
    placeholder?: string;
}

export const EditableList = ({ label, items = [], onUpdate, icon: Icon = Mail, placeholder = "email@example.com" }: EditableListProps) => {
    const [newItem, setNewItem] = useState('');

    const addItem = (e?: React.BaseSyntheticEvent) => {
        e?.preventDefault();
        const value = newItem.trim();
        if (value) {
            onUpdate([...items, value], true);
            setNewItem('');
        }
    };
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            addItem(e);
        }
    };

    const removeItem = (index: number) => {
        onUpdate(items.filter((_, i) => i !== index), true);
    };

    const updateItem = (index: number, value: string) => {
        const updated = [...items];
        updated[index] = value;
        onUpdate(updated);
    };

    return (
        <div>
            {/* Заголовок секции */}
            <span className="text-[10px] font-bold text-[var(--color-ui-text-muted)] uppercase tracking-tight">
                {label}
            </span>

            <div className="space-y-1">
                {items.map((item, idx) => (
                    <div
                        key={`${idx}-${item}`}
                        className="group flex items-center gap-2 bg-[var(--color-ui-bg)] border border-[var(--color-ui-border)] rounded px-2 py-1 transition-all hover:border-[var(--color-ui-accent)] focus-within:border-[var(--color-ui-accent)]"
                    >
                        <Icon size={12} className="text-[var(--color-ui-text-muted)] shrink-0" />
                        <input
                            className="grow bg-transparent text-[11px] text-[var(--color-ui-text)] outline-none focus:text-[var(--color-ui-accent)]"
                            value={item}
                            onChange={(e) => updateItem(idx, e.target.value)}
                            placeholder={placeholder}
                        />
                        <button
                            type="button"
                            title="Удалить"
                            onClick={() => removeItem(idx)}
                            className="text-[var(--color-ui-text-muted)] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 group-focus-within:opacity-100"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Поле добавления */}
            <div className="flex items-center gap-2 mt-2">
                <input
                    className="grow bg-[var(--color-paper-bg)] border border-dashed border-[var(--color-ui-border)] rounded px-2 py-1 text-[11px] text-[var(--color-ui-text)] outline-none focus:border-[var(--color-ui-accent)] focus:border-solid transition-all placeholder:text-[var(--color-ui-text-muted)]/50"
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
                    className="p-1 bg-[var(--color-ui-accent)] text-[var(--color-ui-accent-foreground)] rounded enabled:hover:opacity-90 disabled:opacity-30 disabled:grayscale transition-all"
                >
                    <Plus size={14} />
                </button>
            </div>
        </div>
    );
};