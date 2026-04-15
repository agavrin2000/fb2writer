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
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{label}</span>

            <div className="space-y-1">
                {items.map((item, idx) => (
                    <div key={`${idx}-${item}`} className="group flex items-center gap-2 bg-gray-50 border border-gray-100 rounded px-2 py-1 transition-all hover:border-blue-200 focus-within:border-blue-200">
                        <Icon size={12} className="text-gray-400 shrink-0" />
                        <input
                            className="grow bg-transparent text-[11px] text-gray-600 outline-none focus:text-blue-600"
                            value={item}
                            onChange={(e) => updateItem(idx, e.target.value)}
                            placeholder={placeholder}
                        />
                        <button type="button" title="Удалить"
                            onClick={() => removeItem(idx)}
                            className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 group-focus-within:opacity-100"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Поле добавления */}
            <div className="flex items-center gap-2 mt-2">
                <input
                    className="grow bg-white border border-dashed border-gray-300 rounded px-2 py-1 text-[11px] outline-none focus:border-blue-400 focus:border-solid transition-all"
                    placeholder={placeholder}
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button type="button" title="Добавить"
                    onClick={addItem}
                    disabled={!newItem.trim()}
                    className="p-1 bg-blue-50 text-blue-600 rounded enabled:hover:bg-blue-100 disabled:opacity-50 transition-colors"
                >
                    <Plus size={14} />
                </button>
            </div>
        </div>
    );
};