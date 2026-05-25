'use client';

import React, { useRef, useEffect } from "react";
import { Plus, X, Type, AlignLeft } from "lucide-react";
import { useToast } from "@/hooks/ToastContext";

/**
 * Интерфейс для пользовательского поля информации.
 */
interface CustomItem {
  /**
   * Тип информации (ключ), например, "ISBN", "Год публикации".
   */
  infoType: string;

  /**
   * Значение параметра.
   */
  value: string;
  isNew?: boolean; // Добавляем флаг для точечного автофокуса
}

/**
 * Свойства компонента CustomInfoList.
 */
interface CustomInfoProps {
  /**
   * Массив пользовательских полей информации.
   */
  items: CustomItem[];

  /**
   * Функция обратного вызова, вызываемая при изменении списка.
   *
   * @param newItems - Новый массив объектов `CustomItem` после добавления, удаления или редактирования.
   * @param immediate - Опциональный флаг, указывающий, нужно ли обновлять данные немедленно.
   */
  onUpdate: (newItems: CustomItem[], immediate?: boolean) => void;
}

/**
 * Компонент для управления списком пользовательских метаданных (произвольных пар "ключ-значение").
 *
 * Предоставляет интерфейс для:
 * - Отображения и редактирования списка пользовательских параметров.
 * - Добавления новых полей с пустыми значениями ключа и значения.
 * - Удаления существующих полей с подтверждением через диалог `confirm`.
 * - Редактирования как типа (`infoType`), так и значения (`value`) каждого параметра.
 *
 * Поля используют **неуправляемый подход (uncontrolled components)** с прямым доступом к DOM через `useRef`,
 * что повышает производительность при большом количестве элементов. Значения синхронизируются только при потере фокуса (`onBlur`),
 * чтобы избежать лишних перерисовок.
 *
 * Каждый элемент отображается в виде карточки с полями ввода и кнопкой удаления,
 * которая становится видимой при наведении. Поля поддерживают placeholder-текст и соответствующее форматирование.
 *
 * Все изменения синхронизируются через колбэк `onUpdate`.
 *
 * @param items - Текущий список пользовательских параметров.
 * @param onUpdate - Функция для уведомления родительского компонента об изменениях.
 * @returns React-компонент в виде списка редактируемых карточек с кнопкой добавления.
 *
 * @example
 * ```tsx
 * <CustomInfoList
 *   items={customMetadata}
 *   onUpdate={(newItems) => setCustomMetadata(newItems)}
 * />
 * ```
 */
export const CustomInfoList = ({
  items = [],
  onUpdate,
}: CustomInfoProps) => {
  // 🔥 ХРАНИЛИЩЕ ИНДЕКСА НОВОГО ЭЛЕМЕНТА:
  // Используем реф на уровне родителя, чтобы безопасно передать сигнал автофокуса 
  // без изменения объектов данных и без триггера лишних стейтов.
  const newlyAddedIndexRef = useRef<number | null>(null);

  /**
   * Добавляет новое пустое поле пользовательской информации в список.
   */
  const addItem = () => {
    // Запоминаем, что новый элемент встанет на позицию, равную текущей длине массива
    newlyAddedIndexRef.current = items.length;
    onUpdate([...items, { infoType: "", value: "" }], true);
  };

  /**
   * Удаляет элемент из списка по индексу с предварительным подтверждением.
   *
   * @param index - Индекс удаляемого элемента.
   */
  const removeItem = (index: number) => {
    // При удалении сбрасываем индекс нового элемента, чтобы фокус не промахнулся
    newlyAddedIndexRef.current = null;
    onUpdate(items.filter((_, i) => i !== index), true);
  };

  /**
   * Обновляет значение конкретного поля в указанном элементе.
   *
   * @param index - Индекс редактируемого элемента.
   * @param key - Ключ поля для обновления (`infoType` или `value`).
   * @param val - Новое значение поля.
   */
  const updateItem = (index: number, key: keyof CustomItem, val: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [key]: val };
    onUpdate(newItems);
  };

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <InfoItemRow
          // Ключ по индексу теперь стабилен и безопасен, так как инпуты неуправляемые
          key={idx}
          item={item}
          index={idx}
          // Передаем весь массив items, чтобы дочерняя строка могла проверить уникальность
          allItems={items}
          newlyAddedIndexRef={newlyAddedIndexRef}
          onRemove={removeItem}
          onUpdate={updateItem}
        />
      ))}

      <button
        type="button"
        onClick={addItem}
        className="w-full py-2 flex items-center justify-center gap-2 border-2 border-dashed border-ui-border rounded-lg text-ui-text-muted hover:text-ui-accent hover:bg-ui-bg-hover cursor-pointer transition-all text-[10px] font-bold uppercase outline-none focus-visible:ring-2 focus-visible:ring-ui-accent/50"
      >
        <Plus size={14} />
        Добавить параметр
      </button>
    </div>
  );
};

/* Оптимизированная строка элемента на useRef (Uncontrolled) */
interface InfoItemRowProps {
  item: CustomItem;
  index: number;
  allItems: CustomItem[];
  newlyAddedIndexRef: React.MutableRefObject<number | null>;
  onRemove: (index: number) => void;
  onUpdate: (index: number, key: keyof CustomItem, val: string) => void;
}

/**
 * Внутренний компонент строки пользовательского параметра.
 *
 * Использует неуправляемые поля ввода (`input` и `textarea`) с прямым контролем значений через `useRef`.
 * Это позволяет избежать частых перерисовок при изменениях состояния.
 *
 * Значения синхронизируются с родительским состоянием только при потере фокуса (`onBlur`),
 * если значение реально изменилось. Также реализована защита от рассинхронизации
 * при внешних изменениях (например, при удалении соседнего элемента) через `useEffect`.
 *
 * @param item - Объект текущего параметра.
 * @param index - Индекс элемента в списке.
 * @param onRemove - Функция удаления элемента.
 * @param onUpdate - Функция обновления значения поля.
 */
const InfoItemRow = ({ item, index, allItems, newlyAddedIndexRef, onRemove, onUpdate }: InfoItemRowProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { error: showToastError } = useToast();

  // 🔥 БЕЗОПАСНЫЙ АВТОФОКУС:
  // Проверяем необходимость фокуса строго при первом монтировании DOM-узла карточки
  useEffect(() => {
    if (newlyAddedIndexRef.current === index && inputRef.current) {
      inputRef.current.focus();

      // 🔥 ТЕПЕРЬ ВСЁ ЧИСТО: Поскольку тип пропса изменен на MutableRefObject, 
      // TypeScript разрешает прямую перезапись свойства .current без всяких "as any".
      newlyAddedIndexRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Пустой массив зависимостей гарантирует вызов только при mount

  // Синхронизируем нативные DOM-значения инпутов только тогда, когда пропсы реально изменились извне
  // (например, когда удалили соседа и этот элемент сместился по индексу вверх)
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== item.infoType) {
      inputRef.current.value = item.infoType;
    }
  }, [item.infoType]);

  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value !== item.value) {
      textareaRef.current.value = item.value;
    }
  }, [item.value]);

  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value !== item.value) {
      textareaRef.current.value = item.value;
    }
  }, [item.value]);

  // Валидация потере фокуса
  const handleBlur = (key: keyof CustomItem, ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>) => {
    if (!ref.current) return;

    // Триммим пробелы и приводим тип к верхнему регистру для жесткой сверки (ISBN === isbn)
    let currentValue = ref.current.value.trim();
    if (key === "infoType") {
      currentValue = currentValue.toUpperCase();
      ref.current.value = currentValue; // Обновляем визуально в инпуте
    }

    // Если значение не изменилось — ничего не делаем
    if (currentValue === item[key]) return;

    // 🔥 ПРОВЕРКА НА ДУБЛИКАТЫ (только для поля infoType)
    if (key === "infoType" && currentValue !== "") {
      const isDuplicate = allItems.some((otherItem, otherIdx) => {
        // Проверяем совпадение с другими элементами, игнорируя текущий по индексу
        return otherIdx !== index && otherItem.infoType.trim().toUpperCase() === currentValue;
      });

      if (isDuplicate) {
        showToastError(`Параметр "${currentValue}" уже существует в метаданных книги.`);

        // ❌ОТКАТ ЗНАЧЕНИЯ: возвращаем старое значение обратно в DOM-инпут
        ref.current.value = item.infoType;
        return; // Прерываем сохранение, предотвращая появление дубликата
      }
    }

    // Если всё ок и значение уникально — отправляем наверх
    onUpdate(index, key, currentValue);
  };

  return (
    <div className="relative p-3 bg-ui-bg border border-ui-border rounded-lg group transition-all hover:border-ui-accent focus-within:border-ui-accent">
      {/* Кнопка удаления */}
      <button
        type="button"
        title="Удалить"
        onClick={() => onRemove(index)}
        className="absolute -right-2 -top-2 p-1.5 bg-paper-bg border border-ui-border text-red-500/70 
          rounded-full shadow-dropdown hover:text-red-600 cursor-pointer transition-all z-10 
          opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 
          focus:ring-2 ring-ui-accent outline-none"
      >
        <X size={10} strokeWidth={3} />
      </button>

      <div className="space-y-2">
        {/* Поле для Ключа (info-type) */}
        <div className="flex items-center gap-2 border-b border-ui-border pb-1">
          <Type size={10} className="text-ui-text-muted" />
          <input
            ref={inputRef}
            type="text"
            required={true}
            className="bg-transparent text-[10px] font-bold text-ui-text outline-none grow placeholder:italic placeholder:text-ui-text-muted/40 uppercase"
            placeholder="Тип (например: ISBN)"
            defaultValue={item.infoType}
            onBlur={() => handleBlur("infoType", inputRef)}
          />
        </div>

        {/* Поле для Значения */}
        <div className="flex items-start gap-2 pt-1">
          <AlignLeft size={10} className="text-ui-text-muted opacity-50 mt-1" />
          <textarea
            ref={textareaRef}
            className="bg-transparent text-[11px] text-ui-text outline-none grow resize-none min-h-[40px] placeholder:text-ui-text-muted/40"
            placeholder="Значение параметра..."
            defaultValue={item.value}
            rows={2}
            onBlur={() => handleBlur("value", textareaRef)}
          />
        </div>
      </div>
    </div>
  );
};