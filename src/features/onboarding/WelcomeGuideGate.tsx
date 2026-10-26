import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { updateOnboardingCompleted } from '../../services/repositories/userRepository'
import type { SignUpResult } from '../auth/authService'
import { useAuth, useUserId } from '../auth/useAuth'
import { useUserProfile } from '../auth/useUserProfile'
import { clearGuideRequest, markGuideClosed, useGuideRequested, wasGuideClosed } from './guideState'
import { WelcomeGuide } from './WelcomeGuide'

// L'inscription passe son résultat (e-mail parti ou non) à l'accueil par l'état de navigation
const readSignUpResult = (state: unknown): SignUpResult | null =>
  typeof state === 'object' && state !== null && typeof (state as SignUpResult).welcomeEmailSent === 'boolean'
    ? (state as SignUpResult)
    : null

/** Ouvre le guide de bienvenue après l'inscription, puis à chaque ouverture tant que la case n'est pas cochée */
export function WelcomeGuideGate() {
  const userId = useUserId()
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const location = useLocation()
  const navigate = useNavigate()
  const requested = useGuideRequested()
  const [closed, setClosed] = useState(() => wasGuideClosed(userId))

  if (!profile) return null
  if (!requested && (profile.onboardingCompleted || closed)) return null

  const signUp = readSignUpResult(location.state)

  const close = (dontShowAgain: boolean) => {
    markGuideClosed(userId)
    setClosed(true)
    clearGuideRequest()
    if (signUp) void navigate(location.pathname, { replace: true, state: null })
    // En cas d'échec (hors ligne…), le guide reviendra simplement à la prochaine ouverture
    if (dontShowAgain !== profile.onboardingCompleted) {
      updateOnboardingCompleted(userId, dontShowAgain).catch(() => undefined)
    }
  }

  return (
    <WelcomeGuide
      name={profile.displayName}
      email={user?.email ?? profile.email}
      signUp={signUp}
      dontShowInitially={profile.onboardingCompleted}
      onClose={close}
    />
  )
}
