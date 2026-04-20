import { memo, useRef } from 'react';
import { User, Plus, X, Globe, Fingerprint } from 'lucide-react';
import { Field } from './Field'; // Путь к твоему компоненту Field
import { EditableList } from './EditableList';
import { Fb2Person } from "../../../types/types";


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
                <div
                    key={idx}
                    /* Карточка персоны: используем paper-bg для выделения на фоне ui-bg */
                    className="relative group p-3 bg-[var(--color-paper-bg)] border border-[var(--color-ui-border)] rounded-lg shadow-[var(--shadow-dropdown)] space-y-1 transition-all hover:border-[var(--color-ui-accent)]/50 focus-within:ring-1 ring-[var(--color-ui-accent)]/30"
                >
                    {/* Кнопка удаления */}
                    <button
                        type="button"
                        title="Удалить"
                        onClick={() => removePerson(idx)}
                        /* В темной теме кнопка удаления будет на темном фоне paper-bg */
                        className="absolute -right-2 -top-2 p-1.5 bg-[var(--color-paper-bg)] border border-red-500/20 text-red-500 rounded-full shadow-[var(--shadow-dropdown)] hover:bg-red-500/10 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 transition-all z-20 outline-none"
                    >
                        <X size={12} strokeWidth={3} />
                    </button>

                    {/* Поля ввода (уже адаптированные ранее) */}
                    <Field label="Имя" defaultValue={person.firstName}
                        required={true}
                        error={getError("firstName", person.firstName, !person.nickname || !person.lastName)}
                        touched={true}
                        onChange={(val) => updatePerson(idx, { firstName: val })}
                        ref={(el) => {
                            if (el) {
                                inputRefs.current.set(idx, el);
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

                    {/* Вложенные списки также подхватят тему автоматически */}
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

            {/* Кнопка добавления новой персоны */}
            <button
                type="button"
                onClick={addPerson}
                className="w-full py-2 flex items-center justify-center gap-2 border-2 border-dashed border-[var(--color-ui-border)] rounded-lg text-[var(--color-ui-text-muted)] hover:text-[var(--color-ui-accent)] hover:border-[var(--color-ui-accent)] hover:bg-[var(--color-ui-bg-hover)] transition-all text-[10px] font-bold uppercase"
            >
                <Plus size={14} />
                Добавить {title.toLowerCase()}а
            </button>
        </div>
    );

});

PersonList.displayName = "PersonList";