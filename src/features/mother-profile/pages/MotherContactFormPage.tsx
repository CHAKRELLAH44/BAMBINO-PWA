import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { FormField } from '../../../components/FormField'
import { PageHeader } from '../../../components/PageHeader'
import { dangerButton, errorText, inputClass, labelClass, primaryButton } from '../../../components/styles'
import {
  createMotherContact,
  deleteMotherContact,
  updateMotherContact,
} from '../../../services/repositories/motherRepository'
import { CONTACT_ROLES, type MotherContact } from '../../../types/mother'
import { saveErrorKey } from '../../../utils/firebaseErrors'
import { useUserId } from '../../auth/useAuth'
import { motherContactSchema, type MotherContactValues } from '../schemas'
import { useMotherContacts } from '../useMotherProfile'

const BACK = '/account/profile'

/** Contact utile de la maman : /account/contacts/new ou /account/contacts/:contactId */
export function MotherContactFormPage() {
  const { t } = useTranslation()
  const { contactId } = useParams()
  const { contacts, loading, loadError } = useMotherContacts()

  if (!contactId) return <ContactForm />
  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>
  if (loadError) return <p className={errorText}>{t('common.loadError')}</p>
  const contact = contacts.find((candidate) => candidate.id === contactId)
  if (!contact) return <p className="text-slate-600">{t('motherProfile.contacts.notFound')}</p>
  return <ContactForm key={contact.id} contact={contact} />
}

function ContactForm({ contact }: { contact?: MotherContact }) {
  const { t } = useTranslation()
  const userId = useUserId()
  const navigate = useNavigate()
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MotherContactValues>({
    resolver: zodResolver(motherContactSchema),
    defaultValues: { role: contact?.role ?? 'midwife', name: contact?.name ?? '', phone: contact?.phone ?? '' },
  })
  const fieldError = (message?: string) => (message ? t(message) : undefined)

  const onSubmit = async (values: MotherContactValues) => {
    setActionError(null)
    try {
      if (contact) await updateMotherContact(userId, contact.id, values)
      else await createMotherContact(userId, values)
      await navigate(BACK, { replace: true })
    } catch (error) {
      setActionError(saveErrorKey(error))
    }
  }

  const remove = async () => {
    if (!contact || !window.confirm(t('motherProfile.contacts.deleteConfirm'))) return
    setActionError(null)
    setDeleting(true)
    try {
      await deleteMotherContact(userId, contact.id)
      await navigate(BACK, { replace: true })
    } catch (error) {
      setActionError(saveErrorKey(error))
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader title={t(contact ? 'motherProfile.contacts.editTitle' : 'motherProfile.contacts.newTitle')} backTo={BACK} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <label htmlFor="role" className={labelClass}>
            {t('motherProfile.contacts.role')}
          </label>
          <select id="role" className={inputClass} {...register('role')}>
            {CONTACT_ROLES.map((role) => (
              <option key={role} value={role}>
                {t(`motherProfile.contacts.roles.${role}`)}
              </option>
            ))}
          </select>
        </div>
        <FormField
          id="name"
          label={t('motherProfile.contacts.name')}
          autoComplete="off"
          error={fieldError(errors.name?.message)}
          {...register('name')}
        />
        <FormField
          id="phone"
          type="tel"
          inputMode="tel"
          dir="ltr"
          label={`${t('motherProfile.contacts.phone')} (${t('common.optional')})`}
          error={fieldError(errors.phone?.message)}
          {...register('phone')}
        />
        {actionError && (
          <p role="alert" className={errorText}>
            {t(actionError)}
          </p>
        )}
        <button type="submit" disabled={isSubmitting || deleting} className={primaryButton}>
          {isSubmitting ? t('common.saving') : t('common.save')}
        </button>
      </form>
      {contact && (
        <div className="mt-6 border-t border-rose-100 pt-6">
          <button type="button" onClick={() => void remove()} disabled={deleting} className={`${dangerButton} w-full`}>
            {t('common.delete')}
          </button>
        </div>
      )}
    </>
  )
}
