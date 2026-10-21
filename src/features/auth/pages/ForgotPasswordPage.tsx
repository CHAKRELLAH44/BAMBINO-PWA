import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { AuthCard } from '../../../components/AuthCard'
import { FormField } from '../../../components/FormField'
import { authErrorKey } from '../authErrors'
import { resetPassword } from '../authService'
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [sent, setSent] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = async (values: ForgotPasswordValues) => {
    setSubmitError(null)
    try {
      await resetPassword(values)
      setSent(true)
    } catch (error) {
      setSubmitError(authErrorKey(error))
    }
  }

  return (
    <AuthCard title={t('auth.forgotPassword.title')}>
      {sent ? (
        <div role="status" className="flex flex-col gap-2 text-center">
          <p className="text-slate-700">{t('auth.forgotPassword.sent')}</p>
          <p className="text-xs text-slate-500">{t('auth.forgotPassword.checkSpam')}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FormField
            id="email"
            type="email"
            label={t('auth.fields.email')}
            autoComplete="email"
            error={errors.email?.message && t(errors.email.message)}
            {...register('email')}
          />

          {submitError && (
            <p role="alert" className="text-sm text-red-600">
              {t(submitError)}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-rose-500 px-4 py-2 font-medium text-white hover:bg-rose-600 disabled:opacity-50"
          >
            {isSubmitting ? t('common.loading') : t('auth.forgotPassword.submit')}
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-sm">
        <Link to="/login" className="font-medium text-rose-600">
          {t('auth.forgotPassword.backToLogin')}
        </Link>
      </p>
    </AuthCard>
  )
}
