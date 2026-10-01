/**
 * @param {object} props
 * @param {'sm'|'md'|'lg'} [props.size]
 * @param {string} [props.label]
 */
const Loader = ({ size = 'md', label = 'Loading...' }) => {
  const sizes = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-[3px]',
    lg: 'h-14 w-14 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8" role="status">
      <div
        className={`animate-spin rounded-full border-cyan-accent border-t-transparent ${sizes[size]}`}
        aria-hidden
      />
      <span className="text-sm text-gray-400">{label}</span>
    </div>
  );
};

export default Loader;
