const Alert = ({ variant = 'info', children, className = '' }) => {
  const styles = {
    info: 'border-blue-200 bg-blue-50/80 text-blue-900',
    success: 'border-emerald-200 bg-emerald-50/80 text-emerald-900',
    warning: 'border-amber-200 bg-amber-50/80 text-amber-900',
    error: 'border-rose-200 bg-rose-50/80 text-rose-900',
  };
  return (
    <div className={`rounded-xl border p-3.5 text-sm font-medium ${styles[variant]} ${className}`} role="alert">
      {children}
    </div>
  );
};
export default Alert;