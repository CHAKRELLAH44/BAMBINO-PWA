import { z } from 'zod'
import type { FeedbackKind } from '../../services/email/feedbackEmail'

// Les messages sont des clés de traduction (src/i18n/locales/fr.ts)

export const FEEDBACK_KINDS: FeedbackKind[] = ['idea', 'request', 'problem']

export const feedbackSchema = z.object({
  kind: z.enum(['idea', 'request', 'problem']),
  message: z.string().trim().min(10, 'feedback.validation.tooShort').max(1000, 'validation.tooLong'),
  wantsReply: z.boolean(),
})

export type FeedbackValues = z.infer<typeof feedbackSchema>

// Une minute entre deux envois depuis cet appareil : évite les doubles envois et le remplissage de la boîte de l'équipe
const COOLDOWN_MS = 60_000
const SENT_KEY = 'bambino.feedbackSentAt'

export function feedbackWaitMs(now = Date.now()) {
  try {
    const sentAt = Number(localStorage.getItem(SENT_KEY) ?? 0)
    return Math.max(0, sentAt + COOLDOWN_MS - now)
  } catch {
    return 0
  }
}

export function markFeedbackSent(now = Date.now()) {
  try {
    localStorage.setItem(SENT_KEY, String(now))
  } catch {
    // Stockage indisponible : pas de délai entre deux envois
  }
}
