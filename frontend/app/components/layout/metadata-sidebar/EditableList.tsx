import React, { useState } from 'react';
import { Mail, Plus, X, Check } from 'lucide-react';

interface EditableListProps {
    label: string;
    items: string[];
    onUpdate: (newItems: string[]) => void;
    icon?: any;
    placeholder?: string;
}

export const EditableList = ({ label, items = [], onUpdate, icon: Icon = Mail, placeholder = "email@example.com" }: EditableListProps) => {
    const [newItem, setNewItem] = useState('');

    const addItem = () => {
        if (newItem.trim()) {
            onUpdate([...items, newItem.trim()]);
            setNewItem('');
        }
    };

    const removeItem = (index: number) => {
        onUpdate(items.filter((_, i) => i !== index));
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
                    <div key={idx} className="group flex items-center gap-2 bg-gray-50 border border-gray-100 rounded px-2 py-1 transition-all hover:border-blue-200">
                        <Icon size={12} className="text-gray-400 shrink-0" />
                        <input
                            className="grow bg-transparent text-[11px] text-gray-600 outline-none focus:text-blue-600"
                            value={item}
                            onChange={(e) => updateItem(idx, e.target.value)}
                            placeholder={placeholder}
                        />
                        <button type="button" title="Удалить"
                            onClick={() => removeItem(idx)}
                            className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
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
                    onKeyDown={(e) => e.key === 'Enter' && addItem()}
                />
                <button type="button" title="Добавить"
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
