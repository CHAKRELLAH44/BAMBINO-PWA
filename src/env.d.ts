interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_EMAILJS_SERVICE_ID: string
  readonly VITE_EMAILJS_TEMPLATE_ID: string
  readonly VITE_EMAILJS_PUBLIC_KEY: string
  /** Facultatif : modèle EmailJS des suggestions envoyées à l'équipe */
  readonly VITE_EMAILJS_FEEDBACK_TEMPLATE_ID?: string
  readonly VITE_USE_EMULATORS: string
}
