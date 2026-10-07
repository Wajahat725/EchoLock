const SelectedPositions = ({ selections }) => {
  if (!selections.length) {
    return <p className="text-center text-sm font-medium text-slate-500">Click your 3 secret characters in order on the grid.</p>;
  }

  return (
    <ul className="flex flex-wrap justify-center gap-2">
      {selections.map((sel) => (
        <li
          key={`${sel.row}-${sel.col}`}
          className="rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-sm font-medium"
        >
          <span className="font-bold text-indigo-600">{sel.order}.</span>{' '}
          <span className="text-slate-800">
            {sel.char ?? '?'} at ({sel.row + 1}, {sel.col + 1})
          </span>
        </li>
      ))}
    </ul>
  );
};

export default SelectedPositions;


