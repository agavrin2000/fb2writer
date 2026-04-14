import { useMemo } from 'react';
import { Plus, X } from 'lucide-react';
import { Field } from './Field';

interface Sequence {
    name?: string;
    number?: string | number;
}

interface SequenceListProps {
    items: Sequence[];
    onUpdate: (newItems: Sequence[]) => void;
}

export const SequenceList = ({ items = [], onUpdate }: SequenceListProps) => {

    // Генерируем стабильные ключи на основе контента, чтобы инпуты 
    // не перерисовывались при наборе текста, но обновлялись при Undo.
    const itemsWithKeys = useMemo(() =>
        items.map((item, idx) => ({
            ...item,
            _key: `sequence-block-${idx}` 
        })),
        [items]);

    const addSequence = () => {
        onUpdate([...items, { name: '', number: '' }]);
    };

    const removeSequence = (index: number) => {
        // Мгновенное удаление без блокирующего confirm для стабильности фокуса
        onUpdate(items.filter((_, i) => i !== index));
    };

    const updateSequence = (index: number, updatedFields: Partial<Sequence>) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], ...updatedFields };
        onUpdate(newItems);
    };

        const getError = (field: string, value: string | undefined) => {
        if (!value) {
            return field === "name" ? "Название серии обязательно" : "Номер обязателен";
        }
        return "";
        };
    return (
        <div className="space-y-4">
            {itemsWithKeys.map((seq, idx) => (
                <div
                    key={seq._key}
                    className="relative group p-3 bg-gray-50/50 border border-gray-100 rounded-lg space-y-2 transition-all hover:border-blue-100"
                >
                    <button
                        title="Удалить"
                        type="button"
                        // onMouseDown срабатывает до потери фокуса инпутом
                        onMouseDown={(e) => {
                            e.preventDefault();
                            removeSequence(idx);
                        }}
                        className="absolute -right-2 -top-2 p-1 bg-white border border-red-100 text-red-400 rounded-full shadow-sm hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all z-10"
                    >
                        <X size={10} strokeWidth={3} />
                    </button>

                    <Field
                        // Передаем уникальный ключ в Field, чтобы он сбросился при Undo
                        key={`${seq._key}-name`}
                        label="Название серии"
                        required={true}
                        error={getError("name", seq.name)}
                        touched={true}
                        defaultValue={seq.name}
                        onChange={(val) => updateSequence(idx, { name: val })}
                    />
                    <Field
                        key={`${seq._key}-num`}
                        label="Номер"
                        required={true}
                        error={getError("num", seq.number?.toString())}
                        touched={true}
                        defaultValue={seq.number?.toString()}
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
