import React from 'react';
import { Plus, X } from 'lucide-react';
import { Field } from './field';

interface Sequence {
    name?: string;
    number?: string | number;
}

interface SequenceListProps {
    items: Sequence[];
    onUpdate: (newItems: Sequence[]) => void;
    defaultOpen?: boolean;
}

export const SequenceList = ({ items = [], onUpdate, defaultOpen = false }: SequenceListProps) => {
    
    const addSequence = () => {
        onUpdate([...items, { name: '', number: '' }]);
    };

    const removeSequence = (index: number) => {
        if (window.confirm(`Удалить книгу из серии "${items[index].name || 'без названия'}"?`)) {
            onUpdate(items.filter((_, i) => i !== index));
        }
    };

    const updateSequence = (index: number, updatedFields: Partial<Sequence>) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], ...updatedFields };
        onUpdate(newItems);
    };

    return (
            <div className="space-y-4">
                {items.map((seq, idx) => (
                    <div key={idx} className="relative group p-3 bg-gray-50/50 border border-gray-100 rounded-lg space-y-2 transition-all hover:border-blue-100">
                        {/* Удаление */}
                        <button 
                            title="Удалить"
                            type="button"
                            onClick={() => removeSequence(idx)}
                            className="absolute -right-2 -top-2 p-1 bg-white border border-red-100 text-red-400 rounded-full shadow-sm hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all z-10"
                        >
                            <X size={10} strokeWidth={3} />
                        </button>

                        <Field 
                            label="Название серии" 
                            value={seq.name} 
                            onChange={(val) => updateSequence(idx, { name: val })} 
                        />
                        <Field 
                            label="Номер" 
                            value={seq.number?.toString()} 
                            onChange={(val) => updateSequence(idx, { number: val })} 
                        />
                    </div>
                ))}

                <button
                    type="button"
                    onClick={addSequence}
                    className="w-full py-2 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all text-[9px] font-bold uppercase tracking-tighter"
                >
                    <Plus size={12} />
                    Добавить серию
                </button>
            </div>
    );
};
