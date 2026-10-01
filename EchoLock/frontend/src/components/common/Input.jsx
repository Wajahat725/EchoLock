/**
 * @param {object} props
 * @param {string} [props.label]
 * @param {string} [props.type]
 * @param {string} props.value
 * @param {(e: React.ChangeEvent<HTMLInputElement>) => void} props.onChange
 * @param {string} [props.error]
 * @param {string} [props.placeholder]
 * @param {string} [props.name]
 * @param {string} [props.id]
 * @param {boolean} [props.disabled]
 */
const Input = ({
  label,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  name,
  id,
  disabled = false,
}) => {
  const inputId = id || name || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-gray-300"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full rounded-lg border bg-navy-light px-4 py-2.5 text-gray-100 placeholder-gray-500 transition-colors duration-200 focus:border-cyan-accent focus:outline-none focus:ring-1 focus:ring-cyan-accent disabled:opacity-60 ${
          error ? 'border-danger' : 'border-gray-700'
        }`}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
      />
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
