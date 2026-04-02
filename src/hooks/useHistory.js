import { useRef, useState, useCallback } from 'react';

/**
 * Undo stack using refs for synchronous access.
 * push(snapshot) trims the future and appends a new entry.
 * undo() returns the previous snapshot synchronously.
 */
export function useHistory(initialSnapshot) {
  const stackRef = useRef([initialSnapshot]);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);

  const push = useCallback((snapshot) => {
    const trimmed = stackRef.current.slice(0, indexRef.current + 1);
    stackRef.current = [...trimmed, snapshot];
    const newIndex = stackRef.current.length - 1;
    indexRef.current = newIndex;
    setIndex(newIndex);
  }, []);

  const undo = useCallback(() => {
    const newIndex = Math.max(0, indexRef.current - 1);
    indexRef.current = newIndex;
    setIndex(newIndex);
    return stackRef.current[newIndex] ?? { selections: [], rawPts: null };
  }, []);

  const getCurrent = useCallback(
    () => stackRef.current[indexRef.current] ?? { selections: [], rawPts: null },
    []
  );

  return { push, undo, getCurrent, canUndo: index > 0 };
}
