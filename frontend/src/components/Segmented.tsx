interface Props<T extends string> {
  label: string
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  format?: (value: T) => string
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** A row of mutually exclusive buttons, for short option lists. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  format = capitalize,
}: Props<T>) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={option === value}
            className={option === value ? 'active' : ''}
            onClick={() => onChange(option)}
          >
            {format(option)}
          </button>
        ))}
      </div>
    </div>
  )
}
