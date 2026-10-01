/**
 * @param {object} props
 * @param {'primary'|'secondary'|'danger'} [props.variant]
 * @param {'sm'|'md'|'lg'} [props.size]
 * @param {boolean} [props.loading]
 * @param {boolean} [props.disabled]
 * @param {string} [props.type]
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
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
  const base =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-navy disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-cyan-accent text-navy hover:brightness-110 focus:ring-cyan-accent shadow-glow',
    secondary:
      'bg-navy-lighter border border-cyan-accent/40 text-cyan-accent hover:bg-navy-light focus:ring-cyan-accent',
    danger:
      'bg-danger text-white hover:brightness-110 focus:ring-danger',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
};

export default Button;
