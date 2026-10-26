import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { z } from 'zod'
import { FormField } from '../../components/FormField'
import { PageHeader } from '../../components/PageHeader'
import { dangerButton, errorText, inputClass, labelClass, primaryButton } from '../../components/styles'
import {
  createAppointment,
  deleteAppointment,
  updateAppointment,
} from '../../services/repositories/appointmentRepository'
import { MOTHER, type Appointment, type AppointmentInput } from '../../types/appointment'
import { parseInputValue, toDateTimeInputValue } from '../../utils/dateInput'
import { commentField } from '../../utils/formFields'
import { useUserId } from '../auth/useAuth'
import { useActiveBaby } from '../babies/useActiveBaby'
import { useAppointment } from './useAppointments'
import { saveErrorKey } from '../../utils/firebaseErrors'
import { fileSlug } from '../../utils/download'
import { CalendarExportButton } from '../calendar/CalendarExportButton'
import { appointmentEvent, buildCalendar } from '../calendar/ics'

const STATUSES = ['planned', 'done', 'cancelled'] as const

// Un rendez-vous peut être dans le futur : la date n'est pas limitée
const appointmentSchema = z.object({
  concerne: z.string().min(1, 'validation.required'),
  title: z.string().trim().min(1, 'validation.required').max(100, 'validation.tooLong'),
  scheduledAt: z
    .string()
    .min(1, 'validation.required')
    .refine((value) => parseInputValue(value) !== null, 'validation.invalidDate'),
  location: z.string().trim().max(200, 'validation.tooLong'),
  contact: z.string().trim().max(200, 'validation.tooLong'),
  comment: commentField(),
  status: z.enum(STATUSES),
})

type AppointmentFormValues = z.infer<typeof appointmentSchema>

/** Rendez-vous (§13) : /appointments/new[?for=…] ou /appointments/:appointmentId */
export function AppointmentFormPage() {
  const { appointmentId } = useParams()
  if (!appointmentId) return <AppointmentForm />
  return <EditAppointment key={appointmentId} appointmentId={appointmentId} />
}

function EditAppointment({ appointmentId }: { appointmentId: string }) {
  const { t } = useTranslation()
  const { appointment, loading, loadError } = useAppointment(appointmentId)

  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>
  if (loadError) return <p className={errorText}>{t('common.loadError')}</p>
  if (!appointment) return <p className="text-slate-600">{t('appointments.notFound')}</p>
  return <AppointmentForm appointment={appointment} />
}

function toFormValues(appointment: Appointment | undefined, concerne: string): AppointmentFormValues {
  if (appointment) {
    return {
      concerne: appointment.concerne,
      title: appointment.title,
      scheduledAt: toDateTimeInputValue(appointment.scheduledAt.toDate()),
      location: appointment.location ?? '',
      contact: appointment.contact ?? '',
      comment: appointment.comment,
      status: appointment.status,
    }
  }
  return { concerne, title: '', scheduledAt: '', location: '', contact: '', comment: '', status: 'planned' }
}

function AppointmentForm({ appointment }: { appointment?: Appointment }) {
  const { t } = useTranslation()
  const userId = useUserId()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const listFor = searchParams.get('for')
  // Retour à la liste avec le même filtre (ex. depuis l'espace Maman)
  const listPath = listFor ? `/appointments?for=${listFor}` : '/appointments'
  const { babies, activeBaby } = useActiveBaby()
  const [defaultValues] = useState(() =>
    toFormValues(appointment, listFor ?? activeBaby?.id ?? MOTHER),
  )
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormValues>({ resolver: zodResolver(appointmentSchema), defaultValues })
  const fieldError = (message?: string) => (message ? t(message) : undefined)
  const availableBabies = babies.filter((baby) => !baby.archivedAt || baby.id === appointment?.concerne)

  const onSubmit = async (values: AppointmentFormValues) => {
    setActionError(null)
    const input: AppointmentInput = {
      concerne: values.concerne,
      title: values.title,
      scheduledAt: parseInputValue(values.scheduledAt)!,
      location: values.location || null,
      contact: values.contact || null,
      comment: values.comment,
      status: values.status,
    }
    try {
      if (appointment) await updateAppointment(userId, appointment.id, input)
      else await createAppointment(userId, input)
      await navigate(listPath, { replace: true })
    } catch (error) {
      setActionError(saveErrorKey(error))
    }
  }

  const remove = async () => {
    if (!appointment || !window.confirm(t('appointments.deleteConfirm'))) return
    setActionError(null)
    setDeleting(true)
    try {
      await deleteAppointment(userId, appointment.id)
      await navigate(listPath, { replace: true })
    } catch (error) {
      setActionError(saveErrorKey(error))
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader title={t(appointment ? 'appointments.editTitle' : 'appointments.newTitle')} backTo={listPath} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <label htmlFor="concerne" className={labelClass}>
            {t('appointments.fields.concerne')}
          </label>
          <select id="concerne" className={inputClass} {...register('concerne')}>
            {availableBabies.map((baby) => (
              <option key={baby.id} value={baby.id}>
                {baby.name}
              </option>
            ))}
            <option value={MOTHER}>{t('appointments.mother')}</option>
          </select>
        </div>
        <FormField
          id="title"
          label={t('appointments.fields.title')}
          autoComplete="off"
          error={fieldError(errors.title?.message)}
          {...register('title')}
        />
        <FormField
          id="scheduledAt"
          type="datetime-local"
          label={t('appointments.fields.scheduledAt')}
          error={fieldError(errors.scheduledAt?.message)}
          {...register('scheduledAt')}
        />
        <FormField
          id="location"
          label={`${t('appointments.fields.location')} (${t('common.optional')})`}
          error={fieldError(errors.location?.message)}
          {...register('location')}
        />
        <FormField
          id="contact"
          label={`${t('appointments.fields.contact')} (${t('common.optional')})`}
          error={fieldError(errors.contact?.message)}
          {...register('contact')}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className={labelClass}>
            {t('appointments.fields.status')}
          </label>
          <select id="status" className={inputClass} {...register('status')}>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`appointments.statuses.${status}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="comment" className={labelClass}>
            {t('appointments.fields.comment')} <span className="font-normal text-slate-400">({t('common.optional')})</span>
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

      {appointment && (
        <div className="mt-6 flex flex-col gap-4 border-t border-rose-100 pt-6">
          <AppointmentCalendarExport appointment={appointment} />
          <button type="button" onClick={() => void remove()} disabled={deleting} className={`${dangerButton} w-full`}>
            {t('common.delete')}
          </button>
        </div>
      )}
    </>
  )
}

/** Le rendez-vous enregistré (pas les changements non sauvegardés) va dans l'agenda du téléphone */
function AppointmentCalendarExport({ appointment }: { appointment: Appointment }) {
  const { t } = useTranslation()
  const { babies } = useActiveBaby()
  const [openedAt] = useState(() => new Date())
  const person =
    appointment.concerne === MOTHER
      ? t('appointments.mother')
      : (babies.find((baby) => baby.id === appointment.concerne)?.name ?? '')
  const summary = person ? t('calendar.summary', { title: appointment.title, person }) : appointment.title
  const unavailable =
    appointment.status !== 'planned'
      ? t('calendar.notPlanned')
      : appointment.scheduledAt.toDate() < openedAt
        ? t('calendar.past')
        : null

  return (
    <CalendarExportButton
      fileName={`bambino-${fileSlug(appointment.title, 'rendez-vous')}.ics`}
      build={() => buildCalendar([appointmentEvent(appointment, summary)], new Date())}
      unavailable={unavailable}
    />
  )
}
