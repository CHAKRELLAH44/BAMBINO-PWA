import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { IconBabyBottle, IconChevronRight, IconMoon } from '@tabler/icons-react'
import { isSameDay } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { cardClass } from '../../components/styles'
import { useFormatDuration } from '../../i18n/useFormatDuration'
import type { BabyEvent } from '../../types/event'
import { formatDayHeading, formatTime } from '../../utils/formatDate'
import { summarizeDay } from '../daily-journal/daySummary'
import { useNow } from '../sessions/useNow'
import { buildTimeline, type TimelineDay, type TimelineKind, type TimelineMark } from './dayTimeline'
import { eventPath } from './eventPaths'
import { eventSummaryText } from './eventText'

// Couleurs des marques : variables CSS (index.css), validées daltonisme + contraste en clair et en sombre.
// Le texte ne prend jamais ces couleurs : une petite clé colorée à côté porte l'identité.
const COLORS: Record<TimelineKind, string> = {
  sleep: 'var(--chart-sleep)',
  breastfeeding: 'var(--chart-feeding)',
  bottle: 'var(--chart-bottle)',
}
const KINDS: TimelineKind[] = ['sleep', 'breastfeeding', 'bottle']
// Séance en cours : hachures à 135°, la fin n'est pas définitive
const ONGOING_TEXTURE = 'repeating-linear-gradient(135deg, rgba(255,255,255,0.5) 0 3px, transparent 3px 6px)'
const AXIS_HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24]
// Survol à la souris : le temps d'aller de la marque à son infobulle (lien « Ouvrir »)
const HOVER_GRACE_MS = 250

type Visible = Record<TimelineKind, boolean>
/** Marque affichée : `sticky` = touchée, cliquée ou atteinte au clavier (reste ouverte) ; sinon simple survol */
type Selection = { key: string; sticky: boolean } | null

/**
 * Historique en frises de 24 h (§16) : quand le bébé a dormi et quand il a bu (tétée ou biberon).
 * Une carte par jour avec ses totaux (même calcul que le journal, sans double comptage). On touche ou survole
 * une marque pour son détail, la légende masque ou affiche une activité. La vue liste reste la vue détaillée.
 */
export function HistoryTimeline({
  events,
  from,
  to,
  babyId,
}: {
  events: BabyEvent[]
  from: Date
  to: Date
  /** Bébé des événements s'il n'est pas le bébé suivi (bébé archivé) */
  babyId?: string
}) {
  const { t } = useTranslation()
  // « Maintenant » avance chaque minute : séances en cours et repère de l'heure
  const now = useNow(true, 60_000)
  const [visible, setVisible] = useState<Visible>({ sleep: true, breastfeeding: true, bottle: true })
  const [selection, setSelection] = useState<Selection>(null)
  const days = buildTimeline(events, from, to, now)
  const hasMarks = days.some((day) => day.sleep.length + day.milk.length > 0)
  const noneVisible = KINDS.every((kind) => !visible[kind])

  // Une infobulle ouverte se ferme en touchant ailleurs ou avec Échap
  useEffect(() => {
    if (!selection) return
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (!(event.target as Element).closest('[data-timeline-keep]')) setSelection(null)
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setSelection(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [selection])

  const toggle = (kind: TimelineKind) => {
    setSelection(null)
    setVisible((current) => ({ ...current, [kind]: !current[kind] }))
  }

  return (
    <section aria-label={t('history.timeline.title')} className="flex flex-col gap-3">
      <Legend visible={visible} onToggle={toggle} />
      {!hasMarks && <p className="text-slate-600">{t('history.timeline.empty')}</p>}
      {hasMarks && noneVisible && <p className="text-slate-600">{t('history.timeline.allHidden')}</p>}
      {hasMarks && !noneVisible && (
        <>
          <p className="text-xs text-slate-500">{t('history.timeline.hint')}</p>
          {days.map((day, index) => (
            <DayCard
              key={day.key}
              day={day}
              events={events}
              visible={visible}
              selection={selection}
              onSelect={setSelection}
              babyId={babyId}
              now={now}
              animationOffset={Math.min(index, 4) * 60}
            />
          ))}
        </>
      )}
    </section>
  )
}

/** Clé de couleur (forme de la marque) : barre pour sommeil et tétée, point pour le biberon */
function Key({ kind, ongoing = false }: { kind: TimelineKind; ongoing?: boolean }) {
  return kind === 'bottle' ? (
    <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS.bottle }} />
  ) : (
    <span
      aria-hidden="true"
      className="inline-block h-2.5 w-5 shrink-0 rounded-[3px]"
      style={{ backgroundColor: COLORS[kind], backgroundImage: ongoing ? ONGOING_TEXTURE : undefined }}
    />
  )
}

/** Légende : chaque activité se masque ou s'affiche d'un geste */
function Legend({ visible, onToggle }: { visible: Visible; onToggle: (kind: TimelineKind) => void }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {KINDS.map((kind) => (
        <button
          key={kind}
          type="button"
          aria-pressed={visible[kind]}
          onClick={() => onToggle(kind)}
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-medium ring-1 transition ${
            visible[kind]
              ? 'bg-surface text-slate-700 ring-slate-300 hover:bg-slate-50'
              : 'bg-transparent text-slate-400 line-through ring-slate-200 hover:text-slate-600'
          }`}
        >
          <span className={visible[kind] ? '' : 'opacity-40'}>
            <Key kind={kind} />
          </span>
          {t(`history.timeline.legend.${kind}`)}
        </button>
      ))}
      <span className="inline-flex items-center gap-2 px-2 text-slate-600">
        <Key kind="sleep" ongoing /> {t('history.timeline.legend.ongoing')}
      </span>
      <span className="inline-flex items-center gap-2 px-2 text-slate-600">
        <span aria-hidden="true" className="inline-block h-3 w-0.5 rounded-full bg-slate-700" /> {t('history.timeline.now')}
      </span>
    </div>
  )
}

function DayCard({
  day,
  events,
  visible,
  selection,
  onSelect,
  babyId,
  now,
  animationOffset,
}: {
  day: TimelineDay
  events: BabyEvent[]
  visible: Visible
  selection: Selection
  onSelect: (selection: Selection) => void
  babyId?: string
  now: Date
  animationOffset: number
}) {
  const { t, i18n } = useTranslation()
  const formatDuration = useFormatDuration()
  const summary = summarizeDay(events, day.date)
  const isToday = isSameDay(day.date, now)
  // Jour sans rien de noté (ou seulement des activités masquées) : une ligne au lieu de rails vides
  const empty = !isToday && [...day.sleep, ...day.milk].every((mark) => !visible[mark.kind])

  const stats = [
    summary.sleeps.durationMs > 0 && {
      kind: 'sleep' as const,
      text: t('history.timeline.stats.sleep', { duration: formatDuration(summary.sleeps.durationMs) }),
    },
    summary.feedings.count > 0 && {
      kind: 'breastfeeding' as const,
      text: t('journal.summary.feedings', { count: summary.feedings.count }),
    },
    summary.bottles.count > 0 && {
      kind: 'bottle' as const,
      text: `${t('journal.summary.bottles', { count: summary.bottles.count })} · ${t('common.ml', { ml: summary.bottles.consumedMl })}`,
    },
  ].filter((stat) => stat !== false)

  return (
    <article className={`${cardClass} flex flex-col ${empty ? 'gap-1 py-3' : 'gap-3'} ${isToday ? 'ring-1 ring-rose-200' : ''}`}>
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h3 className="flex items-center gap-2 font-semibold text-slate-800">
          {isToday && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
              {t('history.timeline.today')}
            </span>
          )}
          <span className="first-letter:uppercase">{formatDayHeading(day.date, i18n.language)}</span>
        </h3>
        {stats.length > 0 && (
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
            {stats.map((stat) => (
              <li key={stat.kind} className={`flex items-center gap-1.5 ${visible[stat.kind] ? '' : 'opacity-40'}`}>
                <Key kind={stat.kind} /> {stat.text}
              </li>
            ))}
          </ul>
        )}
      </header>
      {empty ? (
        <p className="text-sm text-slate-500">{t('history.timeline.nothing')}</p>
      ) : (
        <DayChart
          day={day}
          visible={visible}
          selection={selection}
          onSelect={onSelect}
          babyId={babyId}
          now={now}
          isToday={isToday}
          animationOffset={animationOffset}
        />
      )}
    </article>
  )
}

function DayChart({
  day,
  visible,
  selection,
  onSelect,
  babyId,
  now,
  isToday,
  animationOffset,
}: {
  day: TimelineDay
  visible: Visible
  selection: Selection
  onSelect: (selection: Selection) => void
  babyId?: string
  now: Date
  isToday: boolean
  animationOffset: number
}) {
  const { t, i18n } = useTranslation()
  const describe = useDescribeMark()
  const trackRef = useRef<HTMLDivElement>(null)
  const [hoverAt, setHoverAt] = useState<number | null>(null)
  const releaseTimer = useRef<number | undefined>(undefined)
  const sleep = visible.sleep ? day.sleep : []
  const milk = day.milk.filter((mark) => visible[mark.kind])
  // Ordre de lecture : de minuit à minuit, toutes lignes confondues
  const ordered = [...sleep, ...milk].sort((a, b) => a.from - b.from)
  const selectedMark = ordered.find((mark) => `${day.key}/${mark.key}` === selection?.key)

  // Survol seulement : l'infobulle disparaît peu après que la souris quitte la marque (et son infobulle)
  const keepOpen = () => window.clearTimeout(releaseTimer.current)
  const releaseSoon = () => {
    if (selection?.sticky) return
    keepOpen()
    releaseTimer.current = window.setTimeout(() => onSelect(null), HOVER_GRACE_MS)
  }
  useEffect(() => () => window.clearTimeout(releaseTimer.current), [])
  const dayLength = (() => {
    const next = new Date(day.date)
    next.setDate(next.getDate() + 1)
    return next.getTime() - day.date.getTime()
  })()
  const nowFraction = isToday ? (now.getTime() - day.date.getTime()) / dayLength : null

  // Souris : une ligne fine suit le pointeur et donne l'heure (au toucher, on touche directement une marque)
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || !trackRef.current) return
    const box = trackRef.current.getBoundingClientRect()
    setHoverAt(Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)))
  }

  // Flèches gauche / droite : marque précédente ou suivante de la journée
  const onMarkKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const target = ordered[index + (event.key === 'ArrowRight' ? 1 : -1)]
    if (!target) return
    trackRef.current?.querySelector<HTMLButtonElement>(`[data-mark="${CSS.escape(target.key)}"]`)?.focus()
  }

  const markProps = (mark: TimelineMark) => {
    const index = ordered.indexOf(mark)
    const key = `${day.key}/${mark.key}`
    return {
      type: 'button' as const,
      'data-mark': mark.key,
      'data-timeline-keep': true,
      'aria-label': describe(mark),
      'aria-pressed': selectedMark === mark,
      onClick: () => onSelect({ key, sticky: true }),
      onFocus: () => onSelect({ key, sticky: true }),
      onPointerEnter: (event: PointerEvent) => {
        if (event.pointerType !== 'mouse') return
        keepOpen()
        if (!selection?.sticky || selection.key !== key) onSelect({ key, sticky: false })
      },
      onPointerLeave: (event: PointerEvent) => {
        if (event.pointerType === 'mouse') releaseSoon()
      },
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => onMarkKeyDown(event, index),
    }
  }

  const delay = (mark: TimelineMark): CSSProperties => ({
    animationDelay: `${animationOffset + Math.round(mark.from * 300)}ms`,
  })

  return (
    <div dir="ltr" className="flex flex-col gap-1">
      <div className="flex items-stretch gap-2">
        {/* Repères des lignes : sommeil en haut, lait en bas */}
        <div aria-hidden="true" className="flex w-5 shrink-0 flex-col justify-around text-slate-400">
          <IconMoon size={16} stroke={1.75} />
          <IconBabyBottle size={16} stroke={1.75} />
        </div>
        <div
          ref={trackRef}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHoverAt(null)}
          className="relative h-[4.5rem] flex-1"
        >
          {/* Lignes de 3 h en 3 h (fines, en retrait) */}
          {AXIS_HOURS.slice(1, -1).map((hour) => (
            <span
              key={hour}
              aria-hidden="true"
              className={`absolute inset-y-0 w-px ${hour % 6 === 0 ? 'bg-slate-200' : 'bg-slate-100'}`}
              style={{ left: `${(hour / 24) * 100}%` }}
            />
          ))}
          {/* Rails des deux lignes */}
          <span aria-hidden="true" className="absolute inset-x-0 top-3 h-4 rounded-full bg-slate-100/70" />
          <span aria-hidden="true" className="absolute inset-x-0 bottom-3 h-4 rounded-full bg-slate-100/70" />

          <div className="absolute inset-x-0 top-3 h-4">
            {sleep.map((mark) => (
              <button
                key={mark.key}
                {...markProps(mark)}
                className={barClass(selectedMark === mark)}
                style={{ ...barStyle(mark), ...delay(mark) }}
              />
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-3 h-4">
            {milk.map((mark) =>
              mark.kind === 'bottle' ? (
                <button
                  key={mark.key}
                  {...markProps(mark)}
                  className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface transition before:absolute before:-inset-[6px] before:content-[''] hover:scale-125 focus:outline-none motion-safe:animate-timeline-pop ${
                    selectedMark === mark ? 'scale-125 outline-2 outline-offset-2 outline-slate-700' : ''
                  }`}
                  style={{ left: `${mark.from * 100}%`, backgroundColor: COLORS.bottle, ...delay(mark) }}
                />
              ) : (
                <button
                  key={mark.key}
                  {...markProps(mark)}
                  className={barClass(selectedMark === mark)}
                  style={{ ...barStyle(mark), ...delay(mark) }}
                />
              ),
            )}
          </div>

          {nowFraction !== null && (
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-slate-700" style={{ left: `${nowFraction * 100}%` }}>
              <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-slate-700 ring-2 ring-surface" />
            </span>
          )}

          {hoverAt !== null && !selectedMark && (
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px bg-slate-400" style={{ left: `${hoverAt * 100}%` }}>
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-1.5 py-0.5 text-xs font-medium text-slate-50 tabular-nums">
                {formatTime(new Date(day.date.getTime() + hoverAt * dayLength), i18n.language)}
              </span>
            </span>
          )}

          {selectedMark && (
            <MarkTooltip mark={selectedMark} babyId={babyId} now={now} onPointerEnter={keepOpen} onPointerLeave={releaseSoon} />
          )}
        </div>
      </div>
      {/* Axe des heures : toutes les 3 h sur grand écran, toutes les 6 h sur téléphone */}
      <div aria-hidden="true" className="relative ms-7 h-4 text-[11px] tabular-nums text-slate-500">
        {AXIS_HOURS.map((hour) => (
          <span
            key={hour}
            className={`absolute whitespace-nowrap ${hour % 6 === 0 ? '' : 'hidden sm:block'}`}
            style={{
              left: `${(hour / 24) * 100}%`,
              transform: hour === 0 ? undefined : hour === 24 ? 'translateX(-100%)' : 'translateX(-50%)',
            }}
          >
            {t('history.timeline.hour', { hour })}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Détail d'une marque : la valeur d'abord (durée ou quantité), puis l'activité et les heures */
function MarkTooltip({
  mark,
  babyId,
  now,
  onPointerEnter,
  onPointerLeave,
}: {
  mark: TimelineMark
  babyId?: string
  now: Date
  onPointerEnter: () => void
  onPointerLeave: () => void
}) {
  const { t, i18n } = useTranslation()
  const formatDuration = useFormatDuration()
  const time = (date: Date) => formatTime(date, i18n.language)
  const center = mark.kind === 'bottle' ? mark.from : (mark.from + mark.to) / 2
  // Près des bords, l'infobulle s'aligne sur le bord au lieu de déborder
  const transform = center < 0.2 ? 'translateX(0)' : center > 0.8 ? 'translateX(-100%)' : 'translateX(-50%)'
  const left = center < 0.2 ? 0 : center > 0.8 ? 100 : center * 100

  let value: string
  let detail: string
  if (mark.event.type === 'bottle') {
    value = eventSummaryText(mark.event, t, i18n.language)
    detail = t('history.timeline.tip.bottle', { time: time(mark.start) })
  } else {
    const duration = formatDuration((mark.ongoing ? now : mark.end).getTime() - mark.start.getTime())
    value = mark.ongoing ? t('history.timeline.tip.ongoingValue', { duration }) : duration
    const times = { start: time(mark.start), end: time(mark.end) }
    if (mark.kind === 'breastfeeding') {
      const side = t(`feeding.side.${mark.side ?? 'left'}`)
      detail = t(mark.ongoing ? 'history.timeline.tip.feedingOngoing' : 'history.timeline.tip.feeding', { ...times, side })
    } else {
      detail = t(mark.ongoing ? 'history.timeline.tip.sleepOngoing' : 'history.timeline.tip.sleep', times)
    }
  }

  return (
    <div
      role="tooltip"
      // La frise reste de gauche à droite, mais le texte de l'infobulle suit la langue (arabe : de droite à gauche)
      dir={i18n.dir()}
      data-timeline-keep
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className="absolute bottom-full z-20 mb-2 w-max max-w-[15rem] rounded-xl bg-surface px-3 py-2 text-start shadow-lg ring-1 ring-slate-200 motion-safe:animate-guide-step"
      style={{ left: `${left}%`, transform }}
    >
      <p className="flex items-center gap-2">
        <span aria-hidden="true" className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: COLORS[mark.kind] }} />
        <strong className="text-base font-semibold text-slate-800">{value}</strong>
      </p>
      <p className="text-sm text-slate-600">{detail}</p>
      <Link
        to={eventPath(mark.event, babyId)}
        className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700"
      >
        {t('history.timeline.open')}
        <IconChevronRight aria-hidden="true" size={16} className="rtl:rotate-180" />
      </Link>
    </div>
  )
}

const barClass = (isSelected: boolean) =>
  `absolute inset-y-0 origin-left rounded-[4px] transition before:absolute before:-inset-y-1 before:-inset-x-1 before:content-[''] hover:brightness-110 focus:outline-none motion-safe:animate-timeline-grow ${
    isSelected ? 'outline-2 outline-offset-2 outline-slate-700' : ''
  }`

const barStyle = (mark: TimelineMark): CSSProperties => ({
  // 1 px de chaque côté : deux segments qui se touchent (changement de sein) restent séparés par 2 px
  left: `calc(${mark.from * 100}% + 1px)`,
  // Une tétée de 2 min reste visible et touchable
  width: `max(4px, calc(${(mark.to - mark.from) * 100}% - 2px))`,
  backgroundColor: COLORS[mark.kind],
  backgroundImage: mark.ongoing ? ONGOING_TEXTURE : undefined,
})

/** Texte complet d'une marque (lecteur d'écran), avec ses vraies heures (même si elle traverse minuit) */
function useDescribeMark() {
  const { t, i18n } = useTranslation()
  const formatDuration = useFormatDuration()
  const time = (date: Date) => formatTime(date, i18n.language)

  return (mark: TimelineMark) => {
    const times = {
      start: time(mark.start),
      end: time(mark.end),
      duration: formatDuration(mark.end.getTime() - mark.start.getTime()),
    }
    const event = mark.event
    if (event.type === 'bottle') {
      return t('history.timeline.bottle', { time: times.start, summary: eventSummaryText(event, t, i18n.language) })
    }
    if (mark.kind === 'breastfeeding') {
      const side = t(`feeding.side.${mark.side ?? 'left'}`)
      return mark.ongoing
        ? t('history.timeline.feedingOngoing', { ...times, side })
        : t('history.timeline.feeding', { ...times, side })
    }
    return mark.ongoing ? t('history.timeline.sleepOngoing', times) : t('history.timeline.sleep', times)
  }
}

