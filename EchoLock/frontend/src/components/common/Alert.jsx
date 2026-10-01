/**
 * @param {object} props
 * @param {'info'|'success'|'warning'|'error'} [props.variant]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
const Alert = ({ variant = 'info', children, className = '' }) => {
  const styles = {
    info: 'border-cyan-accent/40 bg-cyan-muted text-cyan-accent',
    success: 'border-success/40 bg-success/10 text-success',
    warning: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
    error: 'border-danger/40 bg-danger/10 text-danger',
  };

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${styles[variant]} ${className}`}
      role="alert"
    >
      {children}
    </div>
  );
};

export default Alert;
