/**
 * @param {object} props
 * @param {string} props.char
 * @param {number} props.row
 * @param {number} props.col
 * @param {boolean} props.isSelected
 * @param {number|null} props.order
 * @param {(row: number, col: number) => void} props.onClick
 */
const GridCell = ({ char, row, col, isSelected, order, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(row, col)}
    className={`relative aspect-square w-full rounded-lg border-2 text-lg font-semibold transition-all duration-200 sm:text-xl ${
      isSelected
        ? 'border-cyan-accent bg-cyan-accent/20 text-cyan-accent shadow-glow scale-[0.98]'
        : 'border-gray-700 bg-navy-lighter text-gray-200 hover:border-cyan-accent/60 hover:bg-navy-light'
    }`}
    aria-label={`Cell ${row + 1}, ${col + 1}, character ${char}${
      order ? `, selected order ${order}` : ''
    }`}
  >
    {char}
    {isSelected && order != null && (
      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-accent text-xs font-bold text-navy">
        {order}
      </span>
    )}
  </button>
);

export default GridCell;
