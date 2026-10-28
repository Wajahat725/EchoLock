const Loader = ({ size = 'md', label = 'Loading...' }) => {
  const sizes = { sm: 'h-6 w-6 border-2', md: 'h-10 w-10 border-[3px]', lg: 'h-14 w-14 border-4' };
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6" role="status">
      <div className={`animate-spin rounded-full border-indigo-600 border-t-transparent ${sizes[size]}`} />
      <span className="text-sm font-medium text-slate-600">{label}</span>
    </div>
  );
};

export default Loader;


