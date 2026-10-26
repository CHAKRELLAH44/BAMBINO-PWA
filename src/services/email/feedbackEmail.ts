import { send } from '@emailjs/browser'

// Suggestions des utilisatrices (Bébés → « Une idée, une demande ? ») envoyées à l'équipe par EmailJS
// (gratuit, clé publique seulement, §33). L'adresse de l'équipe est réglée dans le modèle EmailJS,
// jamais dans le code. Variables du modèle : {{kind}}, {{message}}, {{from_name}}, {{reply_to}}, {{language}}.

export type FeedbackKind = 'idea' | 'request' | 'problem'

export const isFeedbackConfigured = () =>
  Boolean(
    import.meta.env.VITE_EMAILJS_SERVICE_ID &&
      import.meta.env.VITE_EMAILJS_FEEDBACK_TEMPLATE_ID &&
      import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
  )

export async function sendFeedback(feedback: {
  kind: string
  message: string
  name: string
  /** Seulement si la maman veut une réponse (case cochée) */
  replyTo: string | null
  language: string
}) {
  await send(
    import.meta.env.VITE_EMAILJS_SERVICE_ID,
    import.meta.env.VITE_EMAILJS_FEEDBACK_TEMPLATE_ID ?? '',
    {
      kind: feedback.kind,
      message: feedback.message,
      from_name: feedback.name,
      reply_to: feedback.replyTo ?? '',
      language: feedback.language,
    },
    { publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY },
  )
}
