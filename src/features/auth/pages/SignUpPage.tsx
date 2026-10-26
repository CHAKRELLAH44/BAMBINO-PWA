import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { AuthCard } from '../../../components/AuthCard'
import { InstallHint } from '../../../components/InstallHint'
import { FormField } from '../../../components/FormField'
import { SegmentedControl } from '../../../components/SegmentedControl'
import { labelClass } from '../../../components/styles'
import { changeAppLanguage } from '../../../i18n'
import { useLanguageOptions } from '../../../i18n/useLanguageOptions'
import { authErrorKey } from '../authErrors'
import { signUp } from '../authService'
import { signUpSchema, type SignUpValues } from '../schemas'

export function SignUpPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const languages = useLanguageOptions()
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { preferredLanguage: languages.current },
  })
  const preferredLanguage = useWatch({ control, name: 'preferredLanguage' })

  const onSubmit = async (values: SignUpValues) => {
    setSubmitError(null)
    try {
      const result = await signUp(values)
      // Le guide de bienvenue lit ce résultat pour dire si l'e-mail de confirmation est parti
      await navigate('/', { replace: true, state: result })
    } catch (error) {
      setSubmitError(authErrorKey(error))
    }
  }

  return (
    <AuthCard title={t('auth.signUp.title')}>
      <InstallHint className="mb-4" />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <FormField
          id="displayName"
          label={t('auth.fields.displayName')}
          autoComplete="given-name"
          error={errors.displayName?.message && t(errors.displayName.message)}
          {...register('displayName')}
        />
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
          autoComplete="new-password"
          error={errors.password?.message && t(errors.password.message)}
          {...register('password')}
        />
        <div className="flex flex-col gap-1">
          <span className={labelClass}>{t('auth.fields.preferredLanguage')}</span>
          <SegmentedControl
            label={t('auth.fields.preferredLanguage')}
            options={languages.options}
            value={preferredLanguage}
            onChange={(language) => {
              setValue('preferredLanguage', language)
              changeAppLanguage(language)
            }}
          />
        </div>

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
          {isSubmitting ? t('common.loading') : t('auth.signUp.submit')}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        {t('auth.signUp.hasAccount')}{' '}
        <Link to="/login" className="font-medium text-rose-600">
          {t('auth.login.link')}
        </Link>
      </p>
    </AuthCard>
  )
}
