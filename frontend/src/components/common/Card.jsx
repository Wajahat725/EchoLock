const Card = ({ children, title, subtitle, className = '' }) => (
  <div className={`rounded-2xl border border-slate-200/80 bg-cream-50 p-6 shadow-[0_12px_36px_-24px_rgba(37,50,91,0.28)] transition-shadow duration-200 hover:shadow-[0_18px_42px_-24px_rgba(37,50,91,0.34)] ${className}`}>
    {(title || subtitle) && (
      <header className="mb-5">
        {title && <h2 className="text-lg font-bold tracking-tight text-indigo-950">{title}</h2>}
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </header>
    )}
    {children}
  </div>
);
export default Card;