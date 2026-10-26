import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { AuthCard } from '../../../components/AuthCard'
import { FormField } from '../../../components/FormField'
import { InstallHint } from '../../../components/InstallHint'
import { authErrorKey } from '../authErrors'
import { logIn } from '../authService'
import { loginSchema, type LoginValues } from '../schemas'
import { markAccountDeleted, wasAccountDeleted } from '../../../utils/localData'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Retour ici juste après la suppression du compte (§3.4) : on le confirme une fois
  const [accountDeleted] = useState(wasAccountDeleted)
  useEffect(() => {
    if (accountDeleted) markAccountDeleted(false)
  }, [accountDeleted])
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (values: LoginValues) => {
    setSubmitError(null)
    try {
      await logIn(values)
      await navigate('/', { replace: true })
    } catch (error) {
      setSubmitError(authErrorKey(error))
    }
  }

  return (
    <AuthCard title={t('auth.login.title')}>
      {accountDeleted && (
        <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          {t('account.deleted')}
        </p>
      )}
      <InstallHint className="mb-4" />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <FormField
          id="email"
          type="email"
          label={t('auth.fields.email')}
          autoComplete="email"
          error={errors.email?.message && t(errors.email.message)}
          {...register('email')}
        />
        <FormField
          id="password"
          type="password"
          label={t('auth.fields.password')}
          autoComplete="current-password"
          error={errors.password?.message && t(errors.password.message)}
          {...register('password')}
        />

        <Link to="/forgot-password" className="self-end text-sm text-rose-600">
          {t('auth.login.forgotPassword')}
        </Link>

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
          {isSubmitting ? t('common.loading') : t('auth.login.submit')}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        {t('auth.login.noAccount')}{' '}
        <Link to="/signup" className="font-medium text-rose-600">
          {t('auth.login.signUpLink')}
        </Link>
      </p>
    </AuthCard>
  )
}
