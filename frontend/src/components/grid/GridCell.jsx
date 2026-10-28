const GridCell = ({ char, row, col, isSelected, order, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(row, col)}
    className={`relative aspect-square w-full rounded-xl border-2 text-lg font-bold transition-all sm:text-xl ${
      isSelected
        ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-[0.97]'
        : 'border-slate-200 bg-white text-slate-800 shadow-sm hover:border-indigo-500 hover:bg-indigo-50/60 hover:text-indigo-700 active:scale-95'
    }`}
  >
    {char}
    {isSelected && order != null && (
      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-900 ring-2 ring-white shadow-sm">
        {order}
      </span>
    )}
  </button>
);

export default GridCell;


