import GridCell from './GridCell';

const Grid = ({ grid, selections, onCellClick, disabled = false }) => {
  if (!grid?.length) return null;

  return (
    <div className="mx-auto grid max-w-md grid-cols-5 gap-2 sm:gap-3" role="grid">
      {grid.map((row, r) =>
        row.map((char, c) => {
          const sel = selections.find((s) => s.row === r && s.col === c);
          return (
            <GridCell
              key={`${r}-${c}`}
              char={char}
              row={r}
              col={c}
              isSelected={!!sel}
              order={sel?.order ?? null}
              onClick={(row, col) => !disabled && onCellClick(row, col)}
            />
          );
        })
      )}
    </div>
  );
};
export default Grid;