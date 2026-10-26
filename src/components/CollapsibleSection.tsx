import { useId, useState, type ReactNode } from 'react'
import { IconChevronDown } from '@tabler/icons-react'
import { readOpen, saveOpen } from './collapsibleState'
import { IconBadge } from './IconBadge'
import type { IconSpec } from './icons'

/** Bloc qui s'ouvre et se ferme d'un geste (accueil) ; son état est gardé sur l'appareil */
export function CollapsibleSection({
  title,
  icon,
  badge,
  storageKey,
  children,
}: {
  title: string
  icon: IconSpec
  /** Petit compteur à côté du titre (facultatif) */
  badge?: string
  storageKey: string
  children: ReactNode
}) {
  const contentId = useId()
  const [open, setOpen] = useState(() => readOpen(storageKey))

  const toggle = () => {
    saveOpen(storageKey, !open)
    setOpen(!open)
  }

  return (
    <section className="flex flex-col gap-2">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={toggle}
          className="flex w-full items-center gap-3 rounded-xl bg-surface px-3 py-2.5 text-start shadow-sm ring-1 ring-rose-200 hover:bg-rose-50"
        >
          <IconBadge spec={icon} size="sm" />
          <span className="flex-1 font-semibold text-slate-700">{title}</span>
          {badge && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">{badge}</span>
          )}
          <IconChevronDown
            aria-hidden="true"
            size={20}
            className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </h2>
      <div id={contentId} hidden={!open}>
        {children}
      </div>
    </section>
  )
}
