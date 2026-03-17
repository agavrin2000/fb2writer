import React from 'react';
import { User, Mail, Plus, X, Globe } from 'lucide-react';
import { Field } from './field'; // Путь к твоему компоненту Field
import { EditableList } from './editable-list';

interface Person {
    FirstName?: string;
    MiddleName?: string;
    LastName?: string;
    Nickname?: string;
    Emails?: string[];
    HomePages?: string[];
}

interface PersonListProps {
    title: string;
    items: Person[];
    onUpdate: (newItems: Person[]) => void;
    icon?: any;
}

export const PersonList = ({ title, items = [], onUpdate, icon: Icon = User }: PersonListProps) => {
    
    const addPerson = () => {
        const newPerson: Person = { FirstName: '', MiddleName: '', LastName: '', Nickname: '', Emails: [] };
        onUpdate([...items, newPerson]);
    };

    const removePerson = (index: number) => {
        const person = items[index];
        const displayName = person.Nickname || person.LastName || "эту запись";
        if (window.confirm(`Вы уверены, что хотите удалить ${displayName}?`)) {
            onUpdate(items.filter((_, i) => i !== index));
        }
    };

    const updatePerson = (index: number, updatedFields: Partial<Person>) => {
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

                    <Field label="Имя" value={person.FirstName} onChange={(val) => updatePerson(idx, { FirstName: val })} />
                    <Field label="Отчество" value={person.MiddleName} onChange={(val) => updatePerson(idx, { MiddleName: val })} />
                    <Field label="Фамилия" value={person.LastName} onChange={(val) => updatePerson(idx, { LastName: val })} />
                    <Field 
                        label="Никнейм" 
                        value={person.Nickname} 
                        icon={User} 
                        className="font-bold text-blue-600" 
                        onChange={(val) => updatePerson(idx, { Nickname: val })} 
                    />
                    
                    <EditableList
                        label="Email"
                        items={person.Emails || []}
                        onUpdate={(newEmails) => updatePerson(idx, { Emails: newEmails })}
                    />
                                    <EditableList
                    label="Домашняя страница"
                    items={person.HomePages || []}
                    icon={Globe}
                    placeholder='http://www.homepage'
                    onUpdate={(newHomePages) => updatePerson(idx, { HomePages: newHomePages })}
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
