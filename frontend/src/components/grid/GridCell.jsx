const GridCell = ({ char, row, col, isSelected, order, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(row, col)}
    className={`relative aspect-square w-full rounded-xl border-2 text-lg font-bold transition-all sm:text-xl ${
      isSelected
        ? 'border-indigo-700 bg-indigo-700 text-white shadow-md shadow-indigo-900/20 scale-[0.97]'
        : 'border-slate-200/90 bg-cream-50 text-slate-800 shadow-sm hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-800 active:scale-95'
    }`}
  >
    {char}
    {isSelected && order != null && (
      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-cream-200 text-xs font-bold text-indigo-950 ring-2 ring-cream-50 shadow-sm">
        {order}
      </span>
    )}
  </button>
);

export default GridCell;

