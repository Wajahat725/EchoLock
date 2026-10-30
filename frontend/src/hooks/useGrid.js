import { useCallback, useState } from 'react';
import { REQUIRED_SECRET_CHARS } from '../utils/constants';

export const useGrid = (maxSelections = REQUIRED_SECRET_CHARS) => {
  const [selections, setSelections] = useState([]);

  const handleCellClick = useCallback(
    (row, col, grid) => {
      setSelections((prev) => {
        const already = prev.some((s) => s.row === row && s.col === col);
        if (already || prev.length >= maxSelections) return prev;
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
    },
    [maxSelections]
  );

  const resetSelections = useCallback(() => setSelections([]), []);

  return {
    selections,
    handleCellClick,
    resetSelections,
    isComplete: selections.length >= maxSelections,
  };
};