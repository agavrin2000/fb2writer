import React from 'react';
import { User, Plus, X, Globe, Fingerprint } from 'lucide-react';
import { Field } from './Field'; // Путь к твоему компоненту Field
import { EditableList } from './EditableList';
import { useConfirm } from '@/hooks/ConfirmContext';
import { Fb2Person } from "@/types/types";


interface PersonListProps {
    title: string;
    items: Fb2Person[];
    onUpdate: (newItems: Fb2Person[]) => void;
    icon?: any;
}

export const PersonList = ({ title, items = [], onUpdate, icon: Icon = User }: PersonListProps) => {
    const confirm = useConfirm();
    const addPerson = () => {
        const newPerson: Fb2Person = { firstName: '', middleName: '', lastName: '', nickname: '', emails: [], id: '' };
        onUpdate([...items, newPerson]);
    };

    const  removePerson = async(index: number) => {
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

    const updatePerson = (index: number, updatedFields: Partial<Fb2Person>) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], ...updatedFields };
        onUpdate(newItems);
    };

    return (
        <div className="space-y-4">

            {items.map((person, idx) => (
                <div key={idx} className="relative group p-3 bg-white border border-gray-200 rounded-lg shadow-sm space-y-1 transition-all hover:border-blue-200">
                    <button
                        type="button"
                        title="Удалить"
                        onClick={() => removePerson(idx)}
                        className="absolute -right-2 -top-2 p-1.5 bg-white border border-red-200 text-red-500 rounded-full shadow-md hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all z-20"
                    >
                        <X size={12} strokeWidth={3} />
                    </button>

                    <Field label="Имя" value={person.firstName} onChange={(val) => updatePerson(idx, { firstName: val })} />
                    <Field label="Отчество" value={person.middleName} onChange={(val) => updatePerson(idx, { middleName: val })} />
                    <Field label="Фамилия" value={person.lastName} onChange={(val) => updatePerson(idx, { lastName: val })} />
                    <Field
                        label="Никнейм"
                        value={person.nickname}
                        icon={User}
                        className="font-bold text-blue-600"
                        onChange={(val) => updatePerson(idx, { nickname: val })}
                    />
                    <Field
                        label="ID"
                        value={person.id}
                        icon={Fingerprint}
                        onChange={(val) => updatePerson(idx, { id: val })}
                    />
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
