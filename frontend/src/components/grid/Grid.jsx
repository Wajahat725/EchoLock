import GridCell from './GridCell';

/**
 * @param {object} props
 * @param {string[][]} props.grid
 * @param {{ row: number, col: number, order: number }[]} props.selections
 * @param {(row: number, col: number) => void} props.onCellClick
 * @param {boolean} [props.disabled]
 */
const Grid = ({ grid, selections, onCellClick, disabled = false }) => {
  if (!grid?.length) {
    return null;
  }

  return (
    <div
      className="mx-auto grid max-w-md grid-cols-5 gap-2 sm:gap-3"
      role="grid"
      aria-label="Authentication character grid"
    >
      {grid.map((row, rowIndex) =>
        row.map((char, colIndex) => {
          const selection = selections.find(
            (s) => s.row === rowIndex && s.col === colIndex
          );
          return (
            <GridCell
              key={`${rowIndex}-${colIndex}`}
              char={char}
              row={rowIndex}
              col={colIndex}
              isSelected={!!selection}
              order={selection?.order ?? null}
              onClick={(row, col) => {
                if (!disabled) onCellClick(row, col);
              }}
            />
          );
        })
      )}
    </div>
  );
};

export default Grid;
