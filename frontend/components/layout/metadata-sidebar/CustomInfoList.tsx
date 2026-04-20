import { Plus, X, Type, AlignLeft } from "lucide-react";


interface CustomItem {
  infoType: string;
  value: string;
}

interface CustomInfoProps {
  items: CustomItem[];
  onUpdate: (newItems: CustomItem[], immediate?: boolean) => void;
}

export const CustomInfoList = ({
  items = [],
  onUpdate,
}: CustomInfoProps) => {
  const addItem = () => {
    onUpdate([...items, { infoType: "", value: "" }], true);
  };

  const removeItem = (index: number) => {
    if (window.confirm("Удалить этот параметр?")) {
      onUpdate(items.filter((_, i) => i !== index), true);
    }
  };

  const updateItem = (index: number, key: keyof CustomItem, val: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [key]: val };
    onUpdate(newItems);
  };

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div
          key={`${idx}-${item.infoType}`}
          /* Используем цвета UI и Paper для карточек */
          className="relative p-3 bg-[var(--color-ui-bg)] border border-[var(--color-ui-border)] rounded-lg group transition-all hover:border-[var(--color-ui-accent)]"
        >
          {/* Кнопка удаления */}
          <button
            type="button"
            title="Удалить"
            onClick={() => removeItem(idx)}
            /* Для кнопок поверх используем Paper-bg, чтобы они выделялись */
            className="absolute -right-2 -top-2 p-1.5 bg-[var(--color-paper-bg)] border border-[var(--color-ui-border)] text-red-500/70 
          rounded-full shadow-[var(--shadow-dropdown)] hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all z-10 group-focus-within:opacity-100 focus:opacity-100 focus:ring-2 ring-[var(--color-ui-accent)]"
          >
            <X size={10} strokeWidth={3} />
          </button>

          <div className="space-y-2">
            {/* Поле для Ключа (info-type) */}
            <div className="flex items-center gap-2 border-b border-[var(--color-ui-border)] pb-1">
              <Type size={10} className="text-[var(--color-ui-text-muted)]" />
              <input
                className="bg-transparent text-[10px] font-bold text-[var(--color-ui-text-muted)] uppercase outline-none grow placeholder:italic"
                placeholder="Тип (например: ISBN)"
                value={item.infoType}
                onChange={(e) => updateItem(idx, "infoType", e.target.value)}
              />
            </div>

            {/* Поле для Значения */}
            <div className="flex items-start gap-2 pt-1">
              <AlignLeft size={10} className="text-[var(--color-ui-text-muted)] opacity-50 mt-1" />
              <textarea
                className="bg-transparent text-[11px] text-[var(--color-ui-text)] outline-none grow resize-none min-h-[40px] placeholder:text-[var(--color-ui-text-muted)]/50"
                placeholder="Значение параметра..."
                value={item.value}
                rows={2}
                onChange={(e) => updateItem(idx, "value", e.target.value)}
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        /* Кнопка добавления: пунктирная граница и акцентный цвет при наведении */
        className="w-full py-2 flex items-center justify-center gap-2 border-2 border-dashed border-[var(--color-ui-border)] rounded-lg text-[var(--color-ui-text-muted)] hover:text-[var(--color-ui-accent)] hover:bg-[var(--color-ui-bg-hover)] transition-all text-[10px] font-bold uppercase"
      >
        <Plus size={14} />
        Добавить параметр
      </button>
    </div>
  );
};
