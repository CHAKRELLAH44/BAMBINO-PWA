import { send } from '@emailjs/browser'

export async function sendWelcomeEmail(to: { name: string; email: string }) {
  await send(
    import.meta.env.VITE_EMAILJS_SERVICE_ID,
    import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
    { to_name: to.name, to_email: to.email },
    { publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY },
  )
}
