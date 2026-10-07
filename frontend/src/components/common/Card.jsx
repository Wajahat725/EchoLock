const Card = ({ children, title, subtitle, className = '' }) => (
  <div className={`rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${className}`}>
    {(title || subtitle) && (
      <header className="mb-4">
        {title && <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>}
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </header>
    )}
    {children}
  </div>
);

export default Card;


