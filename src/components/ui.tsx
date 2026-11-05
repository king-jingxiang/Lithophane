import type { ReactNode } from 'react'

export function Section({
  title,
  hint,
  right,
  children,
}: {
  title: string
  hint?: string
  right?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h2>{title}</h2>
          {hint ? <p className="panel-hint">{hint}</p> : null}
        </div>
        {right}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  )
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  unit = '',
  decimals,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  decimals?: number
  onChange: (v: number) => void
}) {
  const shown = decimals !== undefined ? value.toFixed(decimals) : value
  return (
    <label className="field">
      <span className="field-head">
        <span>{label}</span>
        <span className="field-value">
          {shown}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  )
}

export function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint?: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="toggle-row">
      <div className="toggle-copy">
        <span>{label}</span>
        {hint ? <small>{hint}</small> : null}
      </div>
      <button
        type="button"
        className={`switch ${value ? 'is-on' : ''}`}
        onClick={() => onChange(!value)}
        aria-pressed={value}
        aria-label={label}
      >
        <span />
      </button>
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={value === o.value ? 'is-active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function TextInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label?: string
  value: string
  placeholder?: string
  onChange: (v: string) => void
}) {
  return (
    <label className="field text-field">
      {label ? <span className="field-head">{label}</span> : null}
      <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

export function ChipButton({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button type="button" className="chip" onClick={onClick}>
      {children}
    </button>
  )
}
