import React from 'react';
import { FileCode, Plus, X, Type, AlignLeft } from 'lucide-react';
import { Section } from './Section';

interface CustomItem {
    infoType: string;
    value: string;
}

interface CustomInfoProps {
    items: CustomItem[];
    onUpdate: (newItems: CustomItem[]) => void;
    defaultOpen?: boolean;
}

export const CustomInfoList = ({ items = [], onUpdate, defaultOpen = false }: CustomInfoProps) => {
    
    const addItem = () => {
        onUpdate([...items, { infoType: '', value: '' }]);
    };

    const removeItem = (index: number) => {
        if (window.confirm('Удалить этот параметр?')) {
            onUpdate(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, key: keyof CustomItem, val: string) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [key]: val };
        onUpdate(newItems);
    };
    console.log("RENDER CustomInfoList. Длина массива:", items.length);
    return (
            <div className="space-y-3">
                {items.map((item, idx) => (
                    <div key={`${idx}-${item.infoType}`} className="relative p-3 bg-gray-50 border border-gray-100 rounded-lg group transition-all hover:border-blue-200">
                        {/* Кнопка удаления */}
                        <button 
                            type="button"
                            title="Удалить"
                            onClick={() => removeItem(idx)}
                            className="absolute -right-2 -top-2 p-1.5 bg-white border border-red-100 text-red-400 rounded-full shadow-sm hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all z-10"
                        >
                            <X size={10} strokeWidth={3} />
                        </button>

                        <div className="space-y-2">
                            {/* Поле для Ключа (info-type) */}
                            <div className="flex items-center gap-2 border-b border-gray-200 pb-1">
                                <Type size={10} className="text-gray-400" />
                                <input 
                                    className="bg-transparent text-[10px] font-bold text-gray-500 uppercase outline-none grow placeholder:italic"
                                    placeholder="Тип (например: ISBN)"
                                    value={item.infoType}
                                    onChange={(e) => updateItem(idx, 'infoType', e.target.value)}
                                />
                            </div>

                            {/* Поле для Значения */}
                            <div className="flex items-start gap-2 pt-1">
                                <AlignLeft size={10} className="text-gray-300 mt-1" />
                                <textarea 
                                    className="bg-transparent text-[11px] text-gray-700 outline-none grow resize-none min-h-10 placeholder:text-gray-300"
                                    placeholder="Значение параметра..."
                                    value={item.value}
                                    rows={2}
                                    onChange={(e) => updateItem(idx, 'value', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={addItem}
                    className="w-full py-2 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all text-[10px] font-bold uppercase"
                >
                    <Plus size={14} />
                    Добавить параметр
                </button>
            </div>
    );
};
