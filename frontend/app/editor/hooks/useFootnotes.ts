import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

// 1. Объявляем интерфейс (или импортируем его)
export interface ActiveNote {
  id: string;
  x: number;
  y: number;
  isNew?: boolean;
  pos?: number;
}

export const useFootnotes = () => {
  const [activeNote, setActiveNote] = useState<ActiveNote | null>(null);
  const footnotesRef = useRef<Record<string, any>>({});
  const setActiveNoteRef = useRef(setActiveNote);
  setActiveNoteRef.current = setActiveNote;

  return { activeNote, setActiveNote, footnotesRef, setActiveNoteRef };
};