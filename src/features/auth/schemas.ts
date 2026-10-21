import { z } from 'zod'

// Les messages sont des clés de traduction (src/i18n/locales/fr.ts)
const email = z.email('validation.invalidEmail')

export const signUpSchema = z.object({
  displayName: z.string().trim().min(1, 'validation.required').max(50, 'validation.tooLong'),
  email,
  password: z.string().min(6, 'validation.passwordTooShort'),
  preferredLanguage: z.enum(['fr', 'ar']),
})

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'validation.required'),
})

export const forgotPasswordSchema = z.object({ email })

export type SignUpValues = z.infer<typeof signUpSchema>
export type LoginValues = z.infer<typeof loginSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
