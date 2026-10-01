import { useCallback, useState } from 'react';
import { SECRET_CHAR_COUNT } from '../utils/constants';

/** Manages grid cell selection order (max 3 clicks). */
export const useGrid = () => {
  const [selections, setSelections] = useState([]);

  const handleCellClick = useCallback((row, col, grid) => {
    setSelections((prev) => {
      const already = prev.some((s) => s.row === row && s.col === col);
      if (already || prev.length >= SECRET_CHAR_COUNT) return prev;

      return [
        ...prev,
        {
          row,
          col,
          order: prev.length + 1,
          char: grid?.[row]?.[col],
        },
      ];
    });
  }, []);

  const resetSelections = useCallback(() => setSelections([]), []);

  return {
    selections,
    handleCellClick,
    resetSelections,
    isComplete: selections.length >= SECRET_CHAR_COUNT,
  };
};
