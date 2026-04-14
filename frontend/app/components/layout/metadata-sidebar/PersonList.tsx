import { User, Plus, X, Globe, Fingerprint } from 'lucide-react';
import { Field } from './Field';
import { EditableList } from './EditableList';
import { useConfirm } from '@/hooks/ConfirmContext';
import { Fb2Person } from "@/types/types";
import { useMemo, useCallback } from 'react';

interface PersonListProps {
    title: string;
    items: Fb2Person[];
    onUpdate: (newItems: Fb2Person[]) => void;
}

export const PersonList = ({ title, items = [], onUpdate }: PersonListProps) => {
    const confirm = useConfirm();

    // Стабильные ключи для блоков персон (по индексу, чтобы не пересоздавать DOM при вводе)
    const itemsWithStableKeys = useMemo(() =>
        items.map((item, idx) => ({
            ...item,
            _stableKey: `person-block-${idx}`
        })),
        [items] // Пересчитываем только при изменении количества
    );

    const addPerson = () => {
        const newPerson: Fb2Person = { firstName: '', middleName: '', lastName: '', nickname: '', emails: [], id: '' };
        onUpdate([...items, newPerson]);
    };

    const removePerson = async (index: number) => {
        const person = items[index];
        const displayName = [person.lastName, person.firstName].filter(Boolean).join(' ') || person.nickname || "запись";
        
        const isConfirmed = await confirm.ask(
            "Удаление",
            `Вы уверены, что хотите удалить ${displayName}?`,
            "danger"
        );

        if (isConfirmed) {
            onUpdate(items.filter((_, i) => i !== index));
        }
    };

    const updatePerson = useCallback((index: number, updatedFields: Partial<Fb2Person>) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], ...updatedFields };
        onUpdate(newItems);
    }, [items, onUpdate]);

    return (
        <div className="space-y-4">
            {itemsWithStableKeys.map((person, idx) => (
                <div 
                    key={person._stableKey} 
                    className="relative group p-3 bg-white border border-gray-200 rounded-lg shadow-sm space-y-1 transition-all hover:border-blue-200"
                >
                    <button
                        type="button"
                        title="Удалить"
                        // Используем onMouseDown для стабильности фокуса
                        onMouseDown={(e) => {
                            e.preventDefault();
                            removePerson(idx);
                        }}
                        className="absolute -right-2 -top-2 p-1.5 bg-white border border-red-200 text-red-500 rounded-full shadow-md hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all z-20"
                    >
                        <X size={12} strokeWidth={3} />
                    </button>

                    {/* Используем defaultValue и статичные ключи для Field */}
                    <Field 
                        key={`fn-${idx}`}
                        label="Имя" 
                        defaultValue={person.firstName} 
                        onChange={(val) => updatePerson(idx, { firstName: val })} 
                    />
                    <Field 
                        key={`mn-${idx}`}
                        label="Отчество" 
                        defaultValue={person.middleName} 
                        onChange={(val) => updatePerson(idx, { middleName: val })} 
                    />
                    <Field 
                        key={`ln-${idx}`}
                        label="Фамилия" 
                        defaultValue={person.lastName} 
                        onChange={(val) => updatePerson(idx, { lastName: val })} 
                    />
                    <Field
                        key={`nick-${idx}`}
                        label="Никнейм"
                        defaultValue={person.nickname}
                        icon={User}
                        className="font-bold text-blue-600"
                        onChange={(val) => updatePerson(idx, { nickname: val })}
                    />
                    <Field
                        key={`id-${idx}`}
                        label="ID"
                        defaultValue={person.id}
                        icon={Fingerprint}
                        onChange={(val) => updatePerson(idx, { id: val })}
                    />
                    
                    {/* EditableList тоже должен поддерживать неконтролируемую модель внутри */}
                    <EditableList
                        label="Email"
                        items={person.emails || []}
                        onUpdate={(newEmails) => updatePerson(idx, { emails: newEmails })}
                    />
                    <EditableList
                        label="Домашняя страница"
                        items={person.homePages || []}
                        icon={Globe}
                        placeholder='http://www.homepage'
                        onUpdate={(newHomePages) => updatePerson(idx, { homePages: newHomePages })}
                    />
                </div>
            ))}

            <button
                type="button"
                onClick={addPerson}
                className="w-full py-2 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition-all text-[10px] font-bold uppercase"
            >
                <Plus size={14} />
                Добавить {title.toLowerCase()}
            </button>
        </div>
    );
};
