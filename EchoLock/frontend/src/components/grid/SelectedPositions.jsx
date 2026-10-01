/**
 * @param {object} props
 * @param {{ row: number, col: number, order: number, char?: string }[]} props.selections
 */
const SelectedPositions = ({ selections }) => {
  if (!selections.length) {
    return (
      <p className="text-center text-sm text-gray-500">
        Click your 3 secret characters in order on the grid.
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap justify-center gap-2">
      {selections.map((sel) => (
        <li
          key={`${sel.row}-${sel.col}`}
          className="rounded-lg border border-cyan-accent/30 bg-cyan-muted px-3 py-1.5 text-sm"
        >
          <span className="font-bold text-cyan-accent">{sel.order}.</span>{' '}
          <span className="text-gray-300">
            {sel.char ?? '?'} at ({sel.row + 1}, {sel.col + 1})
          </span>
        </li>
      ))}
    </ul>
  );
};

export default SelectedPositions;
