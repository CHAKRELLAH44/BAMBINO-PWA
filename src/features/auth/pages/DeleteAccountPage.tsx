import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormField } from '../../../components/FormField'
import { PageHeader } from '../../../components/PageHeader'
import { dangerButton, errorText } from '../../../components/styles'
import { deleteAccountErrorKey } from '../authErrors'
import { deleteAccount } from '../authService'
import { deleteAccountSchema, type DeleteAccountValues } from '../schemas'
import { IconAlertTriangle } from '@tabler/icons-react'

/**
 * Suppression du compte (§3.4) : écran de confirmation explicite, puis suppression de toutes les données,
 * du profil et du compte. Une fois le compte supprimé, l'application revient à l'écran de connexion.
 */
export function DeleteAccountPage() {
  const { t } = useTranslation()
  const confirmWord = t('account.confirmWord')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DeleteAccountValues>({ resolver: zodResolver(deleteAccountSchema(confirmWord)) })
  const fieldError = (message?: string) => (message ? t(message) : undefined)

  const onSubmit = async (values: DeleteAccountValues) => {
    setSubmitError(null)
    try {
      await deleteAccount(values.password)
    } catch (error) {
      setSubmitError(deleteAccountErrorKey(error))
    }
  }

  return (
    <>
      <PageHeader title={t('account.deleteTitle')} backTo="/babies" />
      <section className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-900 ring-1 ring-red-200">
        <p className="mb-2 flex items-center gap-2 font-semibold">
          <IconAlertTriangle aria-hidden="true" size={18} stroke={1.75} />
          {t('account.warningTitle')}
        </p>
        <p>{t('account.warning')}</p>
        <p className="mt-2">{t('account.reportHint')}</p>
      </section>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <FormField
          id="confirmation"
          label={t('account.fields.confirmation', { word: confirmWord })}
          autoComplete="off"
          autoCapitalize="characters"
          error={fieldError(errors.confirmation?.message)}
          {...register('confirmation')}
        />
        <FormField
          id="password"
          type="password"
          label={t('account.fields.password')}
          autoComplete="current-password"
          error={fieldError(errors.password?.message)}
          {...register('password')}
        />
        {submitError && (
          <p role="alert" className={errorText}>
            {t(submitError)}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`${dangerButton} bg-red-600 text-white hover:bg-red-700 hover:text-white`}
        >
          {isSubmitting ? t('account.deleting') : t('account.submit')}
        </button>
      </form>
    </>
  )
}
