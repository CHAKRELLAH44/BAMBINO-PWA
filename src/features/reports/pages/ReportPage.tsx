import { subDays } from 'date-fns'
import { useEffect, useState } from 'react'
import { IconCopy, IconDownload, IconShare2 } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { PageHeader } from '../../../components/PageHeader'
import { cardClass, errorText, inputClass, labelClass, primaryButton, secondaryButton } from '../../../components/styles'
import type { Baby } from '../../../types/baby'
import { parseInputValue, toDateInputValue } from '../../../utils/dateInput'
import { useAppointments } from '../../appointments/useAppointments'
import { NoBabyCard } from '../../babies/NoBabyCard'
import { useActiveBaby } from '../../babies/useActiveBaby'
import { useGrowthRecords } from '../../growth/useGrowthRecords'
import { useBabyEvents } from '../../history/useBabyEvents'
import { buildReportDocument, REPORT_CATEGORIES, type ReportCategory, type ReportInput } from '../reportDocument'
import { reportToPdf } from '../reportPdf'
import { REPORT_PERIODS, reportRange, type ReportPeriod } from '../reportPeriod'
import { reportToText } from '../reportText'
import { buildReportVisuals } from '../reportVisuals'
import { downloadFile } from '../../../utils/download'
import { copyText, shareFile, shareText } from '../share'

const MAX_EVENTS = 3000

type Status = { text: string; tone: 'ok' | 'info' | 'error' }

const STATUS_CLASSES: Record<Status['tone'], string> = {
  ok: 'text-emerald-700',
  info: 'text-slate-600',
  error: 'text-red-600',
}

/** Rapports et partage (§18) : /reports[?baby=…] ; sans « baby », le bébé suivi */
export function ReportPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const { babies, activeBaby, loading } = useActiveBaby()

  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>
  const babyParam = searchParams.get('baby')
  const baby = babies.find((candidate) => candidate.id === (babyParam ?? activeBaby?.id))
  if (!baby) return babyParam ? <p className="text-slate-600">{t('growth.babyNotFound')}</p> : <NoBabyCard />
  return <Report key={baby.id} baby={baby} />
}

function Report({ baby }: { baby: Baby }) {
  const { t, i18n } = useTranslation()
  const [openedAt] = useState(() => new Date())
  const [period, setPeriod] = useState<ReportPeriod>('week')
  const [day, setDay] = useState(() => toDateInputValue(openedAt))
  const [customFrom, setCustomFrom] = useState(() => toDateInputValue(subDays(openedAt, 6)))
  const [customTo, setCustomTo] = useState(() => toDateInputValue(openedAt))
  const [categories, setCategories] = useState<ReportCategory[]>([...REPORT_CATEGORIES])
  const [includeGrowthCharts, setIncludeGrowthCharts] = useState(true)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status | null>(null)
  const [working, setWorking] = useState(false)

  // jsPDF est chargé dès l'ouverture : le menu « Partager » doit s'ouvrir juste après le geste
  useEffect(() => {
    void import('jspdf')
    void import('jspdf-autotable')
  }, [])

  const range = reportRange(period, parseInputValue(day), parseInputValue(customFrom), parseInputValue(customTo))
  // La veille aussi : la partie d'une nuit commencée avant la période compte dans le résumé
  const { events, loading, loadError } = useBabyEvents(range ? baby.id : null, {
    from: range ? subDays(range.from, 1) : null,
    to: range?.to ?? null,
    maxCount: MAX_EVENTS,
  })
  const { appointments } = useAppointments(baby.id)
  const { records } = useGrowthRecords(baby.id)

  const input = (generatedAt: Date): ReportInput | null =>
    range && categories.length > 0
      ? { baby, ...range, categories, includeGrowthCharts, message, events, appointments, growthRecords: records, generatedAt }
      : null
  const previewInput = input(openedAt)
  const ready = previewInput !== null && !loading && !loadError && !working
  // Texte dans la langue de l'interface ; PDF toujours en français (§18)
  const textDocument = previewInput ? buildReportDocument(previewInput, t, i18n.language) : null
  const text = textDocument ? reportToText(textDocument) : ''

  const toggleCategory = (category: ReportCategory, checked: boolean) =>
    setCategories((current) =>
      checked ? REPORT_CATEGORIES.filter((item) => item === category || current.includes(item)) : current.filter((item) => item !== category),
    )

  const run = async (action: () => Promise<Status | null>, errorKey: string) => {
    setStatus(null)
    setWorking(true)
    try {
      setStatus(await action())
    } catch {
      setStatus({ text: t(errorKey), tone: 'error' })
    } finally {
      setWorking(false)
    }
  }

  const makePdf = async () => {
    const document = buildReportDocument(input(new Date())!, i18n.getFixedT('fr'), 'fr')
    // Photo (ou avatar) et icônes ; sans elles, le PDF reste complet avec une mise en page simplifiée
    const visuals = await buildReportVisuals(baby).catch(() => ({}))
    return { blob: await reportToPdf(document, visuals), fileName: `${document.fileBase}.pdf`, title: document.title }
  }

  const downloadPdf = () =>
    run(async () => {
      const pdf = await makePdf()
      downloadFile(pdf.blob, pdf.fileName)
      return null
    }, 'reports.pdfError')

  const sharePdf = () =>
    run(async () => {
      const pdf = await makePdf()
      const result = await shareFile(pdf.blob, pdf.fileName, pdf.title)
      if (result === 'unsupported') {
        downloadFile(pdf.blob, pdf.fileName)
        return { text: t('reports.pdfShareUnsupported'), tone: 'info' }
      }
      return result === 'shared' ? { text: t('reports.shared'), tone: 'ok' } : null
    }, 'reports.pdfError')

  const copy = () =>
    run(async () => {
      await copyText(text)
      return { text: t('reports.copied'), tone: 'ok' }
    }, 'reports.copyError')

  const shareAsText = () =>
    run(async () => {
      const result = await shareText(text, textDocument?.title ?? '')
      if (result === 'unsupported') return { text: t('reports.textShareUnsupported'), tone: 'info' }
      return result === 'shared' ? { text: t('reports.shared'), tone: 'ok' } : null
    }, 'reports.copyError')

  return (
    <>
      <PageHeader title={t('reports.title', { name: baby.name })} backTo="/babies" />
      <p className="mb-4 text-sm text-slate-600">{t('reports.intro')}</p>

      {/* Ordinateur : options à gauche, actions et aperçu à droite */}
      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <div>
          <section className={`${cardClass} flex flex-col gap-4`}>
            <div className="grid grid-cols-2 gap-3">
              <div className={`flex flex-col gap-1 ${period === 'custom' ? 'col-span-2' : ''}`}>
                <label htmlFor="period" className={labelClass}>
                  {t('reports.fields.period')}
                </label>
                <select
                  id="period"
                  value={period}
                  onChange={(event) => setPeriod(event.target.value as ReportPeriod)}
                  className={inputClass}
                >
                  {REPORT_PERIODS.map((candidate) => (
                    <option key={candidate} value={candidate}>
                      {t(`reports.periods.${candidate}`)}
                    </option>
                  ))}
                </select>
              </div>
              {period === 'custom' ? (
                <>
                  <DateField id="from" label={t('reports.fields.from')} value={customFrom} onChange={setCustomFrom} />
                  <DateField id="to" label={t('reports.fields.to')} value={customTo} onChange={setCustomTo} />
                </>
              ) : (
                <DateField
                  id="day"
                  label={t(period === 'day' ? 'reports.fields.day' : 'reports.fields.until')}
                  value={day}
                  onChange={setDay}
                />
              )}
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className={`${labelClass} mb-2`}>{t('reports.fields.categories')}</legend>
              <div className="grid grid-cols-2 gap-2">
                {REPORT_CATEGORIES.map((category) => (
                  <label key={category} className="flex items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-rose-500"
                      checked={categories.includes(category)}
                      onChange={(event) => toggleCategory(category, event.target.checked)}
                    />
                    {t(`reports.categories.${category}`)}
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-rose-500"
                  checked={includeGrowthCharts && categories.includes('growth')}
                  disabled={!categories.includes('growth')}
                  onChange={(event) => setIncludeGrowthCharts(event.target.checked)}
                />
                {t('reports.fields.growthCharts')}
              </label>
            </fieldset>

            <div className="flex flex-col gap-1">
              <label htmlFor="message" className={labelClass}>
                {t('reports.fields.message')} <span className="font-normal text-slate-400">({t('common.optional')})</span>
              </label>
              <textarea
                id="message"
                rows={3}
                maxLength={500}
                placeholder={t('reports.messagePlaceholder')}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className={inputClass}
              />
            </div>
          </section>

          {!range && <p className={`${errorText} mt-3`}>{t('reports.invalidPeriod')}</p>}
          {categories.length === 0 && <p className={`${errorText} mt-3`}>{t('reports.noCategory')}</p>}
          {loading && range && <p className="mt-3 text-slate-500">{t('common.loading')}</p>}
          {loadError && <p className={`${errorText} mt-3`}>{t('common.loadError')}</p>}
        </div>
        <div className="lg:-mt-5">
          <section className="mt-5 flex flex-col gap-2">
            <h2 className="font-semibold text-slate-700">{t('reports.pdfTitle')}</h2>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => void downloadPdf()} disabled={!ready} className={primaryButton}>
                <span className="inline-flex items-center justify-center gap-2">
                  <IconDownload aria-hidden="true" size={18} stroke={1.75} />
                  {working ? t('reports.working') : t('reports.download')}
                </span>
              </button>
              <button type="button" onClick={() => void sharePdf()} disabled={!ready} className={primaryButton}>
                <span className="inline-flex items-center justify-center gap-2">
                  <IconShare2 aria-hidden="true" size={18} stroke={1.75} />
                  {t('reports.share')}
                </span>
              </button>
            </div>
            <h2 className="mt-2 font-semibold text-slate-700">{t('reports.textTitle')}</h2>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => void copy()} disabled={!ready} className={secondaryButton}>
                <span className="inline-flex items-center justify-center gap-2">
                  <IconCopy aria-hidden="true" size={18} stroke={1.75} />
                  {t('reports.copy')}
                </span>
              </button>
              <button type="button" onClick={() => void shareAsText()} disabled={!ready} className={secondaryButton}>
                <span className="inline-flex items-center justify-center gap-2">
                  <IconShare2 aria-hidden="true" size={18} stroke={1.75} />
                  {t('reports.share')}
                </span>
              </button>
            </div>
            {status && (
              <p role="status" className={`text-sm ${STATUS_CLASSES[status.tone]}`}>
                {status.text}
              </p>
            )}
            {events.length === MAX_EVENTS && (
              <p className="text-xs text-slate-500">{t('reports.limitNote', { count: MAX_EVENTS })}</p>
            )}
          </section>

          {text && !loading && (
            <section className="mt-5 flex flex-col gap-2">
              <h2 className="font-semibold text-slate-700">{t('reports.preview')}</h2>
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-surface p-3 text-xs text-slate-700 shadow-sm">
                {text}
              </pre>
            </section>
          )}
        </div>
      </div>
    </>
  )
}

function DateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input id={id} type="date" value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />
    </div>
  )
}
