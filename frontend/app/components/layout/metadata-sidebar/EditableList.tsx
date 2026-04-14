import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Mail, Plus, X } from 'lucide-react';

interface EditableListProps {
    label: string;
    items: string[];
    onUpdate: (newItems: string[]) => void;
    icon?: React.ElementType;
    placeholder?: string;
}

export const EditableList = ({ 
    label, 
    items = [], 
    onUpdate, 
    icon: Icon = Mail, 
    placeholder = "email@example.com" 
}: EditableListProps) => {
    const [newItem, setNewItem] = useState('');
    
    // 1. Используем стабильные ключи, чтобы инпуты не пересоздавались при наборе текста
    const itemsWithKeys = useMemo(() => 
        items.map((item, idx) => ({ value: item, id: `item-${idx}` })),
    [items]); // Пересчитываем только при изменении количества

    const addItem = () => {
        if (newItem.trim()) {
            onUpdate([...items, newItem.trim()]);
            setNewItem('');
        }
    };

    const removeItem = (index: number) => {
        onUpdate(items.filter((_, i) => i !== index));
    };

    // 2. Внутренний компонент инпута для поддержки Undo через паттерн с Ref
    const UncontrolledInput = ({ initialValue, onSave }: { initialValue: string, onSave: (val: string) => void }) => {
        const inputRef = useRef<HTMLInputElement>(null);

        // Синхронизация при Undo/Redo
        useEffect(() => {
            if (inputRef.current && inputRef.current.value !== initialValue) {
                inputRef.current.value = initialValue;
            }
        }, [initialValue]);

        return (
            <input
                ref={inputRef}
                className="grow bg-transparent text-[11px] text-gray-600 outline-none focus:text-blue-600"
                defaultValue={initialValue}
                onChange={(e) => onSave(e.target.value)}
                placeholder={placeholder}
            />
        );
    };

    return (
        <div className="mt-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight block mb-1">{label}</span>

            <div className="space-y-1">
                {itemsWithKeys.map((item, idx) => (
                    <div key={item.id} className="group flex items-center gap-2 bg-gray-50 border border-gray-100 rounded px-2 py-1 transition-all hover:border-blue-200">
                        <Icon size={12} className="text-gray-400 shrink-0" />
                        
                        <UncontrolledInput 
                            initialValue={item.value} 
                            onSave={(val) => {
                                const updated = [...items];
                                updated[idx] = val;
                                onUpdate(updated);
                            }} 
                        />

                        <button
                            type="button" 
                             title="Удалить"
                            onMouseDown={(e) => {
                                e.preventDefault(); // Предотвращаем потерю фокуса
                                removeItem(idx);
                            }}
                            className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Поле добавления остается контролируемым (это допустимо для нового элемента) */}
            <div className="flex items-center gap-2 mt-2">
                <input
                    className="grow bg-white border border-dashed border-gray-300 rounded px-2 py-1 text-[11px] outline-none focus:border-blue-400 focus:border-solid transition-all"
                    placeholder={placeholder}
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addItem()}
                />
                <button type="button"
                 title="Удалить"
                    onClick={addItem}
                    disabled={!newItem.trim()}
                    className="p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-50 transition-colors"
                >
                    <Plus size={14} />
                </button>
            </div>
        </div>
    );
};


/*
export const EditableList = ({ label, items = [], onUpdate, icon: Icon = Mail, placeholder = "email@example.com" }: EditableListProps) => {
    const [newItem, setNewItem] = useState('');
    
    // 1. Локальный стейт для мгновенного отображения в интерфейсе
    const [localItems, setLocalItems] = useState(items);

    // 2. Синхронизация: если данные в редакторе изменились извне (например, Undo)
    useEffect(() => {
        setLocalItems(items);
    }, [items]);

    const addItem = () => {
        const trimmed = newItem.trim();
        if (trimmed) {
            const nextItems = [...localItems, trimmed];
            // 3. ОБНОВЛЯЕМ МГНОВЕННО локально
            setLocalItems(nextItems);
            // 4. Отправляем в редактор (в родителе должен быть immediate: true)
            onUpdate(nextItems);
            setNewItem('');
        }
    };

    const removeItem = (index: number) => {
        const nextItems = localItems.filter((_, i) => i !== index);
        setLocalItems(nextItems);
        onUpdate(nextItems);
    };

    // Обновление существующего элемента
    const updateLocalItem = (index: number, val: string) => {
        const updated = [...localItems];
        updated[index] = val;
        setLocalItems(updated);
        onUpdate(updated);
    };

    return (
        <div className="mt-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight block mb-1">{label}</span>
            <div className="space-y-1">
                {localItems.map((item, idx) => (
                    <div key={`item-${idx}`} className="...">
                        <Icon size={12} className="..." />
     
                        <UncontrolledInput 
                            initialValue={item} 
                            onSave={(val) => updateLocalItem(idx, val)} 
                        />
                        <button onMouseDown={(e) => { e.preventDefault(); removeItem(idx); }}>
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
                <input
                    className="..."
                    placeholder={placeholder}
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addItem()}
                />
                <button type="button" onClick={addItem} ...>
                    <Plus size={14} />
                </button>
            </div>
        </div>
    );
};


*/