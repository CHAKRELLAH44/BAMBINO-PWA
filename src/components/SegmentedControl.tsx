export interface SegmentOption<T extends string> {
  value: T
  label: string
  /** Langue du libellé, s'il diffère de l'interface (noms des langues) */
  lang?: string
}

/** Choix exclusif en boutons côte à côte (apparence, langue) : un seul geste, l'effet est immédiat */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-rose-50 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          lang={option.lang}
          dir={option.lang ? 'auto' : undefined}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md py-1.5 text-sm font-medium transition-colors ${
            value === option.value ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-600 hover:bg-rose-100'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
