const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) => {
  const variants = {
    primary: 'bg-indigo-700 hover:bg-indigo-800 text-white shadow-sm shadow-indigo-900/15 focus:ring-indigo-500',
    secondary: 'bg-cream-50 border border-slate-300/90 text-slate-700 hover:bg-white hover:text-indigo-900 shadow-sm focus:ring-indigo-500',
    danger: 'bg-rose-700 hover:bg-rose-800 text-white shadow-sm focus:ring-rose-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs sm:text-sm gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2 font-semibold',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
};

export default Button;

