import { memo, useRef } from 'react';
import { User, Plus, X, Globe, Fingerprint } from 'lucide-react';
import { Field } from './Field'; // Путь к твоему компоненту Field
import { EditableList } from './EditableList';
import { Fb2Person } from "@/types/types";


interface PersonListProps {
    title: string;
    items: Fb2Person[];
    onUpdate: (newItems: Fb2Person[], immediate?: boolean) => void;
}

export const PersonList = memo(({ title, items = [], onUpdate }: PersonListProps) => {
    // Храним массив рефов для каждой персоны
    const inputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

    const addPerson = () => {
        // 1. Рассчитываем будущий индекс нового элемента
        const newIndex = items.length;
        const newPerson: Fb2Person = { firstName: '', middleName: '', lastName: '', nickname: '', emails: [], id: '' };
        onUpdate([...items, newPerson], true);

        // Устанавливаем фокус после того, как React отрендерит новый элемент
        setTimeout(() => {
            inputRefs.current.get(newIndex)?.focus();
        }, 0);
    };

    const removePerson = (index: number) => {
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

    const updatePerson = (index: number, updatedFields: Partial<Fb2Person>) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], ...updatedFields };
        onUpdate(newItems);
    };
    const getError = (field: string, value: string | undefined, required: boolean) => {
        if (!value && required && (field === "nickname" || field === "firstName" || field === "lastName")) {
            return "Никнейм или имя, фамилия обязательны";
        }
        return "";
    };

    return (
        <div className="space-y-4">

            {items.map((person, idx) => (
                <div key={idx} className="relative group p-3 bg-white border border-gray-200 rounded-lg shadow-sm space-y-1 transition-all hover:border-blue-200 focus-within:ring-blue-200">
                    <button
                        type="button"
                        title="Удалить"
                        onClick={() => removePerson(idx)}
                        className="absolute -right-2 -top-2 p-1.5 bg-white border border-red-200 text-red-500 rounded-full shadow-md hover:bg-red-50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 transition-all z-20 outline-none"
                    >
                        <X size={12} strokeWidth={3} />
                    </button>

                    <Field label="Имя" defaultValue={person.firstName}
                        required={true}
                        error={getError("firstName", person.firstName, !person.nickname || !person.lastName)}
                        touched={true}
                        onChange={(val) => updatePerson(idx, { firstName: val })}
                        ref={(el) => {
                            if (el) {
                                inputRefs.current.set(idx, el as HTMLInputElement);
                            } else {
                                inputRefs.current.delete(idx);
                            }
                        }}
                    />
                    <Field label="Отчество" defaultValue={person.middleName} onChange={(val) => updatePerson(idx, { middleName: val })} />
                    <Field label="Фамилия" defaultValue={person.lastName}
                        required={true}
                        error={getError("lastName", person.lastName, !person.nickname || !person.firstName)}
                        touched={true}
                        onChange={(val) => updatePerson(idx, { lastName: val })} />
                    <Field
                        label="Никнейм"
                        defaultValue={person.nickname}
                        icon={User}
                        required={true}
                        error={getError("nickname", person.nickname, !person.firstName || !person.lastName)}
                        touched={true}
                        onChange={(val) => updatePerson(idx, { nickname: val })}
                    />
                    <Field
                        label="ID"
                        defaultValue={person.id}
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
                Добавить {title.toLowerCase()}А
            </button>
        </div>
    );
});

PersonList.displayName = "PersonList";