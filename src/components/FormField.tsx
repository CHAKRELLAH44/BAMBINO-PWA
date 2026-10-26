import type { ComponentProps } from 'react'

type FormFieldProps = ComponentProps<'input'> & { label: string; error?: string }

export function FormField({ label, error, id, ...inputProps }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        className="rounded-lg border border-slate-300 bg-surface px-3 py-2 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
        {...inputProps}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
