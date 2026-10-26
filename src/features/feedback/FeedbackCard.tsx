import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { IconMessageHeart, IconSend, IconSparkles } from '@tabler/icons-react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { IconBadge } from '../../components/IconBadge'
import { Notice } from '../../components/Notice'
import { SegmentedControl } from '../../components/SegmentedControl'
import { cardClass, errorText, inputClass, labelClass, primaryButton } from '../../components/styles'
import { isFeedbackConfigured, sendFeedback } from '../../services/email/feedbackEmail'
import { useAuth } from '../auth/useAuth'
import { useUserProfile } from '../auth/useUserProfile'
import { FEEDBACK_KINDS, feedbackSchema, feedbackWaitMs, markFeedbackSent, type FeedbackValues } from './feedback'

/**
 * « Une idée, une demande ? » (section Bébés) : le message part par e-mail à l'équipe Bambino.
 * L'adresse de la maman n'est jointe que si elle coche « Je veux une réponse ».
 */
export function FeedbackCard() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [status, setStatus] = useState<{ key: string; ok: boolean } | null>(null)
  const configured = isFeedbackConfigured()
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FeedbackValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { kind: 'idea', message: '', wantsReply: false },
  })
  const kind = useWatch({ control, name: 'kind' })

  const onSubmit = async (values: FeedbackValues) => {
    setStatus(null)
    if (feedbackWaitMs() > 0) {
      setStatus({ key: 'feedback.wait', ok: false })
      return
    }
    try {
      await sendFeedback({
        // Toujours en français pour l'équipe, quelle que soit la langue de l'interface
        kind: i18n.getFixedT('fr')(`feedback.kinds.${values.kind}`),
        message: values.message,
        name: profile?.displayName ?? '',
        replyTo: values.wantsReply ? (user?.email ?? null) : null,
        language: i18n.language,
      })
      markFeedbackSent()
      reset()
      setStatus({ key: 'feedback.sent', ok: true })
    } catch {
      setStatus({ key: 'feedback.error', ok: false })
    }
  }

  return (
    <section className={`${cardClass} flex flex-col gap-4`}>
      <h2 className="flex items-center gap-3 font-semibold text-slate-700">
        <IconBadge spec={{ icon: IconMessageHeart, tone: 'violet' }} size="sm" />
        {t('feedback.title')}
      </h2>
      <Notice icon={IconSparkles}>{t('feedback.coming')}</Notice>

      {!configured ? (
        // En développement, on dit à l'équipe ce qui manque (voir README « Messages des utilisatrices »)
        <p className="text-sm text-slate-500">
          {t(import.meta.env.DEV ? 'feedback.notConfiguredDev' : 'feedback.notConfigured')}
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className={labelClass}>{t('feedback.kind')}</span>
            <SegmentedControl
              label={t('feedback.kind')}
              options={FEEDBACK_KINDS.map((value) => ({ value, label: t(`feedback.kinds.${value}`) }))}
              value={kind}
              onChange={(value) => setValue('kind', value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="feedback-message" className={labelClass}>
              {t('feedback.message')}
            </label>
            <textarea
              id="feedback-message"
              rows={4}
              placeholder={t(`feedback.placeholders.${kind}`)}
              className={inputClass}
              {...register('message')}
            />
            {errors.message?.message && <p className={errorText}>{t(errors.message.message)}</p>}
            <p className="text-xs text-slate-500">{t('feedback.privacy')}</p>
          </div>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input type="checkbox" className="mt-0.5 h-5 w-5 accent-rose-500" {...register('wantsReply')} />
            {t('feedback.wantsReply')}
          </label>
          {status && (
            <p role="status" className={status.ok ? 'text-sm font-medium text-emerald-700' : errorText}>
              {t(status.key)}
            </p>
          )}
          <button type="submit" disabled={isSubmitting} className={`${primaryButton} flex items-center justify-center gap-2`}>
            <IconSend aria-hidden="true" size={18} stroke={1.75} className="rtl:-scale-x-100" />
            {isSubmitting ? t('feedback.sending') : t('feedback.send')}
          </button>
        </form>
      )}
    </section>
  )
}
