'use client';

interface NotePopupProps {
  note: { id: string; x: number; y: number };
  content: string;
  onUpdate: (text: string) => void;
  onClose: () => void;
}

export const NotePopup: React.FC<NotePopupProps> = ({ note, content, onUpdate, onClose }) => {
  return (
    <div
      className="fixed z-[100] bg-white shadow-2xl border border-blue-200 rounded-lg p-4 w-80 animate-in fade-in zoom-in duration-150"
      style={{ 
        top: note.y + 10, 
        left: typeof window !== 'undefined' ? Math.min(note.x, window.innerWidth - 340) : note.x 
      }}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-black text-blue-500 uppercase tracking-tighter">
          Примечание: {note.id}
        </span>
        <button 
          onClick={onClose} 
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          ✕
        </button>
      </div>
      
      <textarea
        className="w-full text-sm border rounded p-2 focus:ring-2 focus:ring-blue-400 outline-none min-h-[100px] font-serif resize-none"
        value={content}
        onChange={(e) => onUpdate(e.target.value)}
        autoFocus
      />
      
      <div className="mt-2 text-[9px] text-gray-400 italic leading-tight">
        Текст сохранится автоматически при закрытии или сохранении всей книги.
      </div>
    </div>
  );
};
