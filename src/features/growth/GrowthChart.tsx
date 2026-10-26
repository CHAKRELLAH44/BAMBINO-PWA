import { useTranslation } from 'react-i18next'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDate, formatShortDate } from '../../utils/formatDate'
import type { GrowthPoint } from './growthSeries'

// Une seule courbe par graphique (§15) : pas de légende, le titre de la carte la nomme
const LINE_COLOR = '#f43f5e' // rose-500
// Variables CSS : les couleurs suivent le thème clair ou sombre
const GRID_COLOR = 'var(--color-slate-200)'
const AXIS_TEXT = 'var(--color-slate-500)'
const SURFACE = 'var(--color-surface)'
const DAY_MS = 24 * 60 * 60 * 1000

/** Au plus 4 dates sur l'axe : la première, la dernière et des points intermédiaires */
function pickTicks(points: GrowthPoint[]) {
  if (points.length <= 4) return points.map((point) => point.time)
  return [0, 1, 2, 3].map((i) => points[Math.round((i * (points.length - 1)) / 3)].time)
}

interface LastLabelProps {
  x?: number | string
  y?: number | string
  index?: number
  value?: unknown
}

/**
 * Courbe des mesures saisies, sans courbe de référence ni zone « normale » (§15).
 * Les points sont triés du plus ancien au plus récent ; la liste des mesures sert de vue tableau.
 */
export function GrowthChart({ points, unit, name }: { points: GrowthPoint[]; unit: string; name: string }) {
  const { t, i18n } = useTranslation()
  const formatValue = (value: number) => new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 3 }).format(value)
  const first = points[0].time
  const last = points[points.length - 1].time
  const domain = points.length === 1 ? [first - DAY_MS, last + DAY_MS] : [first, last]

  // Seule la dernière valeur est écrite sur la courbe ; les autres sont dans l'infobulle et la liste
  const renderLastLabel = ({ x, y, index, value }: LastLabelProps) =>
    index === points.length - 1 && typeof value === 'number' ? (
      <text x={Number(x)} y={Number(y) - 12} textAnchor="end" fontSize={12} fontWeight={600} fill="var(--color-slate-700)">
        {formatValue(value)}
      </text>
    ) : null

  return (
    // Axe du temps de gauche à droite, même en arabe
    <figure aria-label={t('growth.chartLabel', { name })} dir="ltr" className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 24, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeWidth={1} />
          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={domain}
            ticks={pickTicks(points)}
            tickFormatter={(time: number) => formatShortDate(new Date(time), i18n.language)}
            tick={{ fill: AXIS_TEXT, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: GRID_COLOR }}
            padding={{ left: 16, right: 24 }}
          />
          <YAxis
            dataKey="value"
            domain={['auto', 'auto']}
            width={44}
            tickFormatter={formatValue}
            tick={{ fill: AXIS_TEXT, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ stroke: 'var(--color-slate-300)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              const point = active ? (payload?.[0]?.payload as GrowthPoint | undefined) : undefined
              if (!point) return null
              return (
                <div className="rounded-lg bg-surface px-3 py-2 text-sm shadow-md ring-1 ring-slate-200">
                  <p className="font-semibold text-slate-800">
                    {formatValue(point.value)} {unit}
                  </p>
                  <p className="text-slate-500">{formatDate(new Date(point.time), i18n.language)}</p>
                </div>
              )
            }}
          />
          <Line
            dataKey="value"
            // Segments droits : une courbe lissée inventerait des valeurs entre deux mesures
            type="linear"
            stroke={LINE_COLOR}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={{ r: 4, fill: LINE_COLOR, stroke: SURFACE, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: LINE_COLOR, stroke: SURFACE, strokeWidth: 2 }}
            label={renderLastLabel}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  )
}
