import { IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import type { Icon } from './icons'

const TONES = {
  info: { box: 'bg-sky-50 text-sky-900 ring-sky-200', icon: IconInfoCircle },
  warning: { box: 'bg-amber-50 text-amber-900 ring-amber-200', icon: IconInfoCircle },
  danger: { box: 'bg-red-50 text-red-900 ring-red-200', icon: IconAlertTriangle },
}

/** Encadré d'information ou d'avertissement, avec son icône */
export function Notice({
  tone = 'info',
  icon,
  className = '',
  children,
}: {
  tone?: keyof typeof TONES
  icon?: Icon
  className?: string
  children: ReactNode
}) {
  const IconComponent = icon ?? TONES[tone].icon
  return (
    <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ring-1 ${TONES[tone].box} ${className}`}>
      <IconComponent aria-hidden="true" size={18} stroke={1.75} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
