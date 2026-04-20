import { Plus, X } from 'lucide-react';
import { Field } from './Field';
import { useRef } from 'react';

/**
 * Интерфейс элемента серии, входящей в состав книги.
 */
interface Sequence {
  /**
   * Название серии (например, "Метро 2033").
   */
  name?: string;

  /**
   * Порядковый номер книги в серии (например, 1, 2, 3).
   */
  number?: string | number;
}

/**
 * Свойства компонента списка серий.
 */
interface SequenceListProps {
  /**
   * Текущий список серий, отображаемых в интерфейсе.
   * @default []
   */
  items: Sequence[];

  /**
   * Функция обратного вызова, вызываемая при изменении списка.
   * @param newItems - Обновлённый массив серий.
   * @param immediate - Флаг, указывающий, было ли изменение инициировано пользователем напрямую (добавление/удаление), а не вводом текста.
   */
  onUpdate: (newItems: Sequence[], immediate?: boolean) => void;

  /**
   * Определяет, будут ли секции раскрыты по умолчанию.
   * @default false
   */
  defaultOpen?: boolean;
}

/**
 * Компонент для управления списком серий, к которым принадлежит книга.
 * Позволяет:
 * - Добавлять новые записи с названием и номером.
 * - Редактировать поля каждой серии.
 * - Удалять записи с плавным возвращением фокуса на предыдущий элемент.
 * - Валидировать обязательные поля (название и номер).
 *
 * Особенности:
 * - Использует `useRef` для управления фокусом на динамически создаваемых полях ввода.
 * - При добавлении новой серии автоматически устанавливает фокус на поле названия.
 * - При удалении — возвращает фокус на предыдущую или первую оставшуюся запись.
 * - Поддерживает пошаговое обновление состояния (`immediate: false` при вводе, `true` при добавлении/удалении).
 *
 * @component
 * @param props - Входные параметры компонента {@link SequenceListProps}.
 *
 * @example
 * <SequenceList
 *   items={sequences}
 *   onUpdate={(updated) => setSequences(updated)}
 * />
 */
export const SequenceList = ({ items = [], onUpdate }: SequenceListProps) => {
  // Храним массив рефов для каждого названия серии
  const inputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  /**
   * Добавляет новую пустую запись серии в конец списка.
   * После рендеринга устанавливает фокус на поле ввода названия.
   */
  const addSequence = () => {
    const newItems = [...items, { name: '', number: '' }];
    onUpdate(newItems, true);
    // Устанавливаем фокус после того, как React отрендерит новый элемент
    setTimeout(() => {
      const lastIndex = newItems.length - 1;
      inputRefs.current.get(lastIndex)?.focus();
    }, 0);
  };

  /**
   * Удаляет серию по индексу.
   * После удаления возвращает фокус на предыдущую запись для удобства пользователя.
   * @param index - Индекс удаляемой серии.
   */
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

  /**
   * Обновляет одно или несколько полей указанной серии.
   * Вызывается при изменении ввода в любом из полей.
   * @param index - Индекс обновляемой серии.
   * @param updatedFields - Объект с частичными изменениями (например, `{ name: "Новая серия" }`).
   */
  const updateSequence = (index: number, updatedFields: Partial<Sequence>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updatedFields };
    onUpdate(newItems, false); // Передаем false, так как это ввод текста
  };

  /**
   * Возвращает сообщение об ошибке валидации для заданного поля.
   * @param field - Имя поля: `"name"` или `"number"`.
   * @param value - Значение поля.
   * @returns Сообщение об ошибке, если значение пустое; иначе — пустая строка.
   */
  const getError = (field: string, value: string | undefined) => {
    if (!value) {
      return field === "name" ? "Название серии обязательно" : "Номер обязателен";
    }
    return "";
  };

  return (
    <div className="space-y-4">
      {items.map((seq, idx) => (
        <div
          key={idx}
          /* Карточка серии: чуть светлее фона в светлой теме и Slate-800 в темной */
          className="relative group p-3 bg-[var(--color-ui-bg)]/50 border border-[var(--color-ui-border)] rounded-lg space-y-2 transition-all hover:border-[var(--color-ui-accent)] focus-within:border-[var(--color-ui-accent)]"
        >
          {/* Удаление */}
          <button
            title="Удалить"
            type="button"
            onClick={() => { inputRefs.current.delete(idx); removeSequence(idx); }}
            /* Используем paper-bg для контраста кнопки на фоне карточки */
            className="absolute -right-2 -top-2 p-1 bg-[var(--color-paper-bg)] border border-[var(--color-ui-border)] text-red-500/70 rounded-full shadow-[var(--shadow-dropdown)] 
                       hover:text-red-600 hover:border-red-500/30
                       opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 
                       focus:ring-2 ring-red-500/20 outline-none
                       transition-all z-10"
          >
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
            defaultValue={seq.name}
            required={true}
            error={getError("name", seq.name)}
            touched={true}
            onChange={(val) => updateSequence(idx, { name: val })}
          />
          <Field
            label="Номер"
            defaultValue={seq.number?.toString()}
            required={true}
            error={getError("number", seq.number?.toString())}
            touched={true}
            onChange={(val) => updateSequence(idx, { number: val })}
          />
        </div>
      ))}

      {/* Кнопка добавления серии */}
      <button
        type="button"
        onClick={addSequence}
        className="w-full py-2 flex items-center justify-center gap-2 border-2 border-dashed border-[var(--color-ui-border)] rounded-lg text-[var(--color-ui-text-muted)] hover:text-[var(--color-ui-accent)] hover:bg-[var(--color-ui-bg-hover)] transition-all text-[9px] font-bold uppercase tracking-tighter"
      >
        <Plus size={12} />
        Добавить серию
      </button>
    </div>
  );
};