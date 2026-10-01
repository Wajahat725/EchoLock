/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {string} [props.className]
 */
const Card = ({ children, title, subtitle, className = '' }) => (
  <div
    className={`rounded-xl border border-gray-800/80 bg-navy-light/80 p-6 shadow-lg backdrop-blur-sm ${className}`}
  >
    {(title || subtitle) && (
      <header className="mb-5">
        {title && (
          <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
        )}
        {subtitle && (
          <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
        )}
      </header>
    )}
    {children}
  </div>
);

export default Card;
