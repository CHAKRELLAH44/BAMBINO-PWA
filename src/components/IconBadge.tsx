import type { IconSpec, Tone } from './icons'

const TONES: Record<Tone, string> = {
  rose: 'bg-rose-100 text-rose-600',
  amber: 'bg-amber-100 text-amber-700',
  violet: 'bg-violet-100 text-violet-700',
  sky: 'bg-sky-100 text-sky-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  slate: 'bg-slate-100 text-slate-600',
}

const SIZES = {
  sm: { box: 'h-8 w-8', icon: 18 },
  md: { box: 'h-10 w-10', icon: 22 },
  lg: { box: 'h-14 w-14', icon: 30 },
}

/** Icône d'une catégorie dans une pastille teintée (décorative : le texte voisin porte le sens) */
export function IconBadge({ spec, size = 'md' }: { spec: IconSpec; size?: keyof typeof SIZES }) {
  const Icon = spec.icon
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${TONES[spec.tone]} ${SIZES[size].box}`}
    >
      <Icon size={SIZES[size].icon} stroke={1.75} />
    </span>
  )
}
