import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { FormField } from '../../../components/FormField'
import { PageHeader } from '../../../components/PageHeader'
import { dangerButton, errorText, inputClass, labelClass, primaryButton } from '../../../components/styles'
import {
  createMotherWeight,
  deleteMotherWeight,
  updateMotherWeight,
} from '../../../services/repositories/motherRepository'
import type { MotherWeight } from '../../../types/mother'
import { parseInputValue, toDateTimeInputValue } from '../../../utils/dateInput'
import { saveErrorKey } from '../../../utils/firebaseErrors'
import { useUserId } from '../../auth/useAuth'
import { parseDecimal } from '../../growth/growthSeries'
import { motherWeightSchema, type MotherWeightValues } from '../schemas'
import { useMotherWeights } from '../useMotherProfile'

const BACK = '/account/profile'

/** Pesée de la maman : /account/weight/new ou /account/weight/:weightId */
export function MotherWeightFormPage() {
  const { t } = useTranslation()
  const { weightId } = useParams()
  const { weights, loading, loadError } = useMotherWeights()

  if (!weightId) return <WeightForm />
  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>
  if (loadError) return <p className={errorText}>{t('common.loadError')}</p>
  const weight = weights.find((candidate) => candidate.id === weightId)
  if (!weight) return <p className="text-slate-600">{t('motherProfile.weight.notFound')}</p>
  return <WeightForm key={weight.id} weight={weight} />
}

function WeightForm({ weight }: { weight?: MotherWeight }) {
  const { t, i18n } = useTranslation()
  const userId = useUserId()
  const navigate = useNavigate()
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [defaultValues] = useState<MotherWeightValues>(() => ({
    measuredAt: toDateTimeInputValue(weight ? weight.measuredAt.toDate() : new Date()),
    // Virgule en français, point en arabe (les deux sont acceptés)
    weightKg: weight ? (i18n.language.startsWith('fr') ? String(weight.weightKg).replace('.', ',') : String(weight.weightKg)) : '',
    comment: weight?.comment ?? '',
  }))
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MotherWeightValues>({ resolver: zodResolver(motherWeightSchema), defaultValues })
  const fieldError = (message?: string) => (message ? t(message) : undefined)

  const onSubmit = async (values: MotherWeightValues) => {
    setActionError(null)
    const input = { weightKg: parseDecimal(values.weightKg)!, measuredAt: parseInputValue(values.measuredAt)!, comment: values.comment }
    try {
      if (weight) await updateMotherWeight(userId, weight.id, input)
      else await createMotherWeight(userId, input)
      await navigate(BACK, { replace: true })
    } catch (error) {
      setActionError(saveErrorKey(error))
    }
  }

  const remove = async () => {
    if (!weight || !window.confirm(t('motherProfile.weight.deleteConfirm'))) return
    setActionError(null)
    setDeleting(true)
    try {
      await deleteMotherWeight(userId, weight.id)
      await navigate(BACK, { replace: true })
    } catch (error) {
      setActionError(saveErrorKey(error))
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader title={t(weight ? 'motherProfile.weight.editTitle' : 'motherProfile.weight.newTitle')} backTo={BACK} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <FormField
          id="weightKg"
          inputMode="decimal"
          label={t('motherProfile.weight.value')}
          error={fieldError(errors.weightKg?.message)}
          {...register('weightKg')}
        />
        <FormField
          id="measuredAt"
          type="datetime-local"
          label={t('motherProfile.weight.measuredAt')}
          error={fieldError(errors.measuredAt?.message)}
          {...register('measuredAt')}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="comment" className={labelClass}>
            {t('motherProfile.weight.comment')} <span className="font-normal text-slate-400">({t('common.optional')})</span>
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
      {weight && (
        <div className="mt-6 border-t border-rose-100 pt-6">
          <button type="button" onClick={() => void remove()} disabled={deleting} className={`${dangerButton} w-full`}>
            {t('common.delete')}
          </button>
        </div>
      )}
    </>
  )
}
