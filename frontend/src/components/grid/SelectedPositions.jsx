import { REQUIRED_SECRET_CHARS, DECOY_CLICKS, TOTAL_CLICKS } from '../../utils/constants';

const SelectedPositions = ({ selections }) => {
  if (!selections.length) {
    return (
      <p className="text-center text-sm font-medium text-slate-500">
        Click your {REQUIRED_SECRET_CHARS} secret characters in order, plus {DECOY_CLICKS} extra
        decoy clicks anywhere on the grid ({TOTAL_CLICKS} clicks total, in any mix).
      </p>
    );
  }

  return (
    <div className="space-y-2">
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
      <p className="text-center text-xs text-slate-500">
        {selections.length} of {TOTAL_CLICKS} clicks selected
      </p>
    </div>
  );
};
export default SelectedPositions;