import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { FormField } from '../../../components/FormField'
import { PageHeader } from '../../../components/PageHeader'
import { dangerButton, errorText, inputClass, labelClass, primaryButton } from '../../../components/styles'
import {
  createGrowthRecord,
  deleteGrowthRecord,
  updateGrowthRecord,
} from '../../../services/repositories/growthRepository'
import type { Baby } from '../../../types/baby'
import { GROWTH_TYPES, STANDARD_UNITS, type GrowthInput, type GrowthRecord } from '../../../types/growth'
import { parseInputValue, toDateTimeInputValue } from '../../../utils/dateInput'
import { saveErrorKey } from '../../../utils/firebaseErrors'
import { useUserId } from '../../auth/useAuth'
import { NoBabyCard } from '../../babies/NoBabyCard'
import { useActiveBaby } from '../../babies/useActiveBaby'
import { growthQuery, parseDecimal, parseSeriesId, type SeriesKey } from '../growthSeries'
import { growthSchema, type GrowthFormValues } from '../schemas'
import { useGrowthRecord, useGrowthRecords } from '../useGrowthRecords'

/** Mesure de croissance (§15) : /growth/new ou /growth/:recordId, avec [?baby=…][&series=…] */
export function GrowthFormPage() {
  const { t } = useTranslation()
  const { recordId } = useParams()
  const [searchParams] = useSearchParams()
  const { babies, activeBaby, loading } = useActiveBaby()

  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>
  const babyParam = searchParams.get('baby')
  const baby = babies.find((candidate) => candidate.id === (babyParam ?? activeBaby?.id))
  if (!baby) return babyParam ? <p className="text-slate-600">{t('growth.babyNotFound')}</p> : <NoBabyCard />
  const preset = parseSeriesId(searchParams.get('series'))
  if (!recordId) return <NewGrowth key={baby.id} baby={baby} babyParam={babyParam} preset={preset} />
  return <EditGrowth key={`${baby.id}/${recordId}`} baby={baby} babyParam={babyParam} recordId={recordId} />
}

interface FormContext {
  baby: Baby
  babyParam: string | null
}

function NewGrowth({ baby, babyParam, preset }: FormContext & { preset: SeriesKey | null }) {
  const { t } = useTranslation()
  const { records, loading } = useGrowthRecords(baby.id)

  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>
  return <GrowthForm baby={baby} babyParam={babyParam} preset={preset} records={records} />
}

function EditGrowth({ baby, babyParam, recordId }: FormContext & { recordId: string }) {
  const { t } = useTranslation()
  const { record, loading, loadError } = useGrowthRecord(baby.id, recordId)
  const { records } = useGrowthRecords(baby.id)

  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>
  if (loadError) return <p className={errorText}>{t('common.loadError')}</p>
  if (!record) return <p className="text-slate-600">{t('growth.notFound')}</p>
  return <GrowthForm baby={baby} babyParam={babyParam} preset={null} records={records} record={record} />
}

const seriesKeyOf = (type: GrowthRecord['type'], label: string | null): SeriesKey =>
  type === 'custom' ? { type, label } : { type, label: null }

function toFormValues(
  record: GrowthRecord | undefined,
  preset: SeriesKey | null,
  records: GrowthRecord[],
  language: string,
): GrowthFormValues {
  if (record) {
    return {
      type: record.type,
      label: record.label ?? '',
      unit: record.type === 'custom' ? record.unit : '',
      // Le champ se saisit comme on écrit : virgule décimale en français
      value: language.startsWith('fr') ? String(record.value).replace('.', ',') : String(record.value),
      measuredAt: toDateTimeInputValue(record.measuredAt.toDate()),
      comment: record.comment,
    }
  }
  const label = preset?.type === 'custom' ? (preset.label ?? '') : ''
  // Une mesure personnalisée déjà connue reprend son unité (`records` : plus récente d'abord)
  const knownUnit = records.find((candidate) => candidate.type === 'custom' && candidate.label === label)?.unit
  return {
    type: preset?.type ?? 'weight',
    label,
    unit: label ? (knownUnit ?? '') : '',
    value: '',
    measuredAt: toDateTimeInputValue(new Date()),
    comment: '',
  }
}

function GrowthForm({
  baby,
  babyParam,
  preset,
  records,
  record,
}: FormContext & { preset: SeriesKey | null; records: GrowthRecord[]; record?: GrowthRecord }) {
  const { t, i18n } = useTranslation()
  const userId = useUserId()
  const navigate = useNavigate()
  const [defaultValues] = useState(() => toFormValues(record, preset, records, i18n.language))
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<GrowthFormValues>({ resolver: zodResolver(growthSchema(baby.birthDate.toDate())), defaultValues })
  const type = useWatch({ control, name: 'type' })
  const unit = useWatch({ control, name: 'unit' })
  const fieldError = (message?: string) => (message ? t(message) : undefined)
  const customLabels = [
    ...new Set(records.filter((candidate) => candidate.type === 'custom').map((candidate) => candidate.label ?? '')),
  ].sort()
  const valueUnit = type === 'custom' ? unit.trim() : STANDARD_UNITS[type]
  const listPath = (key?: SeriesKey) => `/growth${growthQuery(babyParam, key)}`
  const backTo = listPath(record ? seriesKeyOf(record.type, record.label) : (preset ?? undefined))

  const onSubmit = async (values: GrowthFormValues) => {
    setActionError(null)
    const input: GrowthInput = {
      type: values.type,
      label: values.type === 'custom' ? values.label : null,
      unit: values.type === 'custom' ? values.unit : STANDARD_UNITS[values.type],
      value: parseDecimal(values.value)!,
      measuredAt: parseInputValue(values.measuredAt)!,
      comment: values.comment,
    }
    try {
      if (record) await updateGrowthRecord(userId, baby.id, record.id, input)
      else await createGrowthRecord(userId, baby.id, input)
      await navigate(listPath(seriesKeyOf(input.type, input.label)), { replace: true })
    } catch (error) {
      setActionError(saveErrorKey(error))
    }
  }

  const remove = async () => {
    if (!record || !window.confirm(t('growth.deleteConfirm'))) return
    setActionError(null)
    setDeleting(true)
    try {
      await deleteGrowthRecord(userId, baby.id, record.id)
      await navigate(backTo, { replace: true })
    } catch (error) {
      setActionError(saveErrorKey(error))
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader title={t(record ? 'growth.editTitle' : 'growth.newTitle')} backTo={backTo} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        {record ? (
          // Le type d'une mesure ne change pas (règles) : affiché, pas modifiable
          <div className="flex flex-col gap-1">
            <span className={labelClass}>{t('growth.fields.type')}</span>
            <span className="text-slate-800">{t(`growth.types.${record.type}`)}</span>
            <input type="hidden" {...register('type')} />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label htmlFor="type" className={labelClass}>
              {t('growth.fields.type')}
            </label>
            <select id="type" className={inputClass} {...register('type')}>
              {GROWTH_TYPES.map((growthType) => (
                <option key={growthType} value={growthType}>
                  {t(`growth.types.${growthType}`)}
                </option>
              ))}
            </select>
          </div>
        )}

        {type === 'custom' && (
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <FormField
                id="label"
                label={t('growth.fields.label')}
                list="growth-labels"
                autoComplete="off"
                error={fieldError(errors.label?.message)}
                {...register('label')}
              />
              <datalist id="growth-labels">
                {customLabels.map((label) => (
                  <option key={label} value={label} />
                ))}
              </datalist>
            </div>
            <FormField
              id="unit"
              label={t('growth.fields.unit')}
              autoComplete="off"
              error={fieldError(errors.unit?.message)}
              {...register('unit')}
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <FormField
            id="value"
            inputMode="decimal"
            autoComplete="off"
            label={valueUnit ? t('growth.fields.valueWithUnit', { unit: valueUnit }) : t('growth.fields.value')}
            error={fieldError(errors.value?.message)}
            {...register('value')}
          />
          <p className="text-xs text-slate-500">{t('growth.valueHint')}</p>
        </div>

        <FormField
          id="measuredAt"
          type="datetime-local"
          label={t('growth.fields.measuredAt')}
          error={fieldError(errors.measuredAt?.message)}
          {...register('measuredAt')}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="comment" className={labelClass}>
            {t('growth.fields.comment')} <span className="font-normal text-slate-400">({t('common.optional')})</span>
          </label>
          <textarea id="comment" rows={2} className={inputClass} {...register('comment')} />
          {errors.comment?.message && <p className={errorText}>{t(errors.comment.message)}</p>}
        </div>

        {actionError && (
          <p role="alert" className={errorText}>
            {t(actionError)}
          </p>
        )}
        <button type="submit" disabled={isSubmitting || deleting} className={primaryButton}>
          {isSubmitting ? t('common.saving') : t('common.save')}
        </button>
      </form>

      {record && (
        <div className="mt-6 border-t border-rose-100 pt-6">
          <button type="button" onClick={() => void remove()} disabled={deleting} className={`${dangerButton} w-full`}>
            {t('common.delete')}
          </button>
        </div>
      )}
    </>
  )
}
