import { Plus, X } from 'lucide-react';
import { Field } from './Field';
import { useRef } from 'react';

interface Sequence {
    name?: string;
    number?: string | number;
}

interface SequenceListProps {
    items: Sequence[];
    onUpdate: (newItems: Sequence[], immediate?: boolean) => void;
    defaultOpen?: boolean;
}

export const SequenceList = ({ items = [], onUpdate }: SequenceListProps) => {

    // Храним массив рефов для каждого названия серии
    const inputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

    const addSequence = () => {
        const newItems = [...items, { name: '', number: '' }];
        onUpdate(newItems, true);
        // Устанавливаем фокус после того, как React отрендерит новый элемент
        setTimeout(() => {
            const lastIndex = newItems.length - 1;
            inputRefs.current.get(lastIndex)?.focus();
        }, 0);
    };

    const removeSequence = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        onUpdate(newItems, true);

        // UX: возвращаем фокус на предыдущий элемент, чтобы не терять позицию
        requestAnimationFrame(() => {
            const nextTarget = index > 0 ? index - 1 : 0;
            if (newItems.length > 0) {
                inputRefs.current.get(nextTarget)?.focus();
            }
        });
    };

    const updateSequence = (index: number, updatedFields: Partial<Sequence>) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], ...updatedFields };
        onUpdate(newItems, false); // Передаем false, так как это ввод текста
    };

    const getError = (field: string, value: string | undefined) => {
        if (!value) {
            return field === "name" ? "Название серии обязательно" : "Номер обязателен";
        }
        return "";
    };
    return (
        <div className="space-y-4">
            {items.map((seq, idx) => (
                <div key={idx} className="relative group p-3 bg-gray-50/50 border border-gray-100 rounded-lg space-y-2 transition-all hover:border-blue-200 focus-within:border-blue-200">
                    {/* Удаление */}
                    <button
                        title="Удалить"
                        type="button"
                        onClick={() => { inputRefs.current.delete(idx); removeSequence(idx); }}
                        className="absolute -right-2 -top-2 p-1 bg-white border border-red-100 text-red-400 rounded-full shadow-sm 
                                   hover:text-red-600 hover:border-red-200
                                   opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 
                                   focus:ring-2 focus:ring-red-100 outline-none
                                   transition-all z-10"                    >
                        <X size={10} strokeWidth={3} />
                    </button>

                    <Field
                        ref={(el) => {
                            if (el) {
                                inputRefs.current.set(idx, el as HTMLInputElement);
                            } else {
                                inputRefs.current.delete(idx);
                            }
                        }}
                        label="Название серии"
                        value={seq.name}
                        required={true}
                        error={getError("name", seq.name)}
                        touched={seq.name !== ''}
                        onChange={(val) => updateSequence(idx, { name: val })}
                    />
                    <Field
                        label="Номер"
                        value={seq.number?.toString()}
                        required={true}
                        error={getError("number", seq.number?.toString())}
                        touched={seq.number !== undefined && seq.number !== ''}
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