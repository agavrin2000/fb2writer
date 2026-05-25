import { memo, useRef } from 'react';
import { User, Plus, X, Globe, Fingerprint } from 'lucide-react';
import { Field } from './Field'; // Путь к твоему компоненту Field
import { EditableList } from './EditableList';
import { Fb2Person } from "../../../types/types";

/**
 * Интерфейс свойств компонента PersonList.
 */
interface PersonListProps {
    /**
     * Заголовок списка персон (например, "Автор", "Редактор").
     * Используется в кнопке добавления новой персоны.
     */
    title: string;

    /**
     * Список объектов типа `Fb2Person`, представляющих персон (авторов, редакторов и т.д.).
     * Каждый объект содержит поля: имя, отчество, фамилия, никнейм, email, домашняя страница, ID.
     */
    items: Fb2Person[];

    /**
     * Функция обратного вызова, вызываемая при изменении списка персон.
     *
     * @param newItems - Новый массив объектов `Fb2Person` после добавления, удаления или редактирования.
     * @param immediate - Опциональный флаг, указывающий, нужно ли обновлять данные немедленно (например, при добавлении/удалении).
     */
    onUpdate: (newItems: Fb2Person[], immediate?: boolean) => void;
}

/**
 * Компонент списка персон для редактирования метаданных FB2-книги.
 *
 * Предоставляет интерфейс для:
 * - Отображения и редактирования списка персон (авторов, редакторов и т.д.) с возможностью ввода имени, отчества, фамилии, никнейма, ID, email и домашних страниц.
 * - Добавления новых персон с автоматической установкой фокуса на первое поле.
 * - Удаления существующих персон с плавной анимацией и возвратом фокуса на предыдущий элемент.
 * - Валидации обязательных полей: либо указаны имя и фамилия, либо никнейм.
 *
 * Все изменения синхронизируются через колбэк `onUpdate`.
 *
 * @param title - Заголовок списка (например, "Автор").
 * @param items - Текущий список персон.
 * @param onUpdate - Функция для уведомления родительского компонента об изменениях.
 * @returns React-компонент в виде списка карточек персон с кнопкой добавления.
 *
 * @example
 * ```tsx
 * <PersonList
 *   title="Автор"
 *   items={authors}
 *   onUpdate={(newAuthors) => setAuthors(newAuthors)}
 * />
 * ```
 *
 * @remarks
 * Компонент обернут в `memo` для оптимизации производительности.
 * Управление фокусом реализовано с помощью `useRef` и `setTimeout`/`requestAnimationFrame` для корректной работы с DOM после рендеринга.
 */
export const PersonList = memo(({ title, items = [], onUpdate }: PersonListProps) => {
    // Храним массив рефов для каждой персоны
    const inputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

    /**
     * Добавляет новую пустую персону в список.
     * После добавления устанавливает фокус на поле "Имя" новой персоны.
     */
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

    /**
     * Удаляет персону по индексу.
     * После удаления возвращает фокус на предыдущую персону для улучшения UX.
     *
     * @param index - Индекс удаляемой персоны в массиве.
     */
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

    /**
     * Обновляет данные конкретной персоны.
     *
     * @param index - Индекс персоны в массиве.
     * @param updatedFields - Объект с полями, которые необходимо обновить (частичное обновление).
     */
    const updatePerson = (index: number, updatedFields: Partial<Fb2Person>) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], ...updatedFields };
        onUpdate(newItems);
    };

    /**
     * Проверяет обязательные поля и возвращает сообщение об ошибке, если необходимо.
     * Обязательно заполнить либо имя и фамилию, либо никнейм.
     *
     * @param field - Название поля (используется только для логики, но не в сообщении).
     * @param value - Текущее значение поля.
     * @param required - Флаг, указывающий, что поле обязательно (зависит от наличия альтернативного поля).
     * @returns Сообщение об ошибке, если проверка не пройдена; иначе — пустая строка.
     */
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
                    className="relative group p-3 bg-paper-bg border border-ui-border rounded-lg shadow-dropdown space-y-1 transition-all hover:border-ui-accent/50 focus-within:ring-1 ring-ui-accent/30"
                >
                    {/* Кнопка удаления */}
                    <button
                        type="button"
                        title="Удалить"
                        onClick={() => removePerson(idx)}
                        /* В темной теме кнопка удаления будет на темном фоне paper-bg */
                        className="absolute -right-2 -top-2 p-1.5 bg-paper-bg border border-red-500/20 text-red-500 rounded-full shadow-dropdown hover:bg-red-500/10 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 transition-all z-20 outline-none"
                    >
                        <X size={12} strokeWidth={3} />
                    </button>

                    {/* Поля ввода (уже адаптированные ранее) */}
                    <Field label="Имя" defaultValue={person.firstName}
                        required={true}
                        error={getError("firstName", person.firstName, !person.nickname)}
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
                        error={getError("lastName", person.lastName, !person.nickname)}
                        touched={true}
                        onChange={(val) => updatePerson(idx, { lastName: val })}
                    />
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
                className="w-full py-2 flex items-center justify-center gap-2 border-2 border-dashed border-ui-border rounded-lg text-ui-text-muted hover:text-ui-accent hover:border-ui-accent hover:bg-ui-bg-hover transition-all text-[10px] font-bold uppercase"
            >
                <Plus size={14} />
                Добавить {title.toLowerCase()}а
            </button>
        </div>
    );
});

// Устанавливаем отображаемое имя компонента для отладки
PersonList.displayName = "PersonList";