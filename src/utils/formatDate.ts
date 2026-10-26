// Affichage des dates dans la langue de l'interface et le fuseau horaire de l'appareil

export const formatTime = (date: Date, language: string) =>
  new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' }).format(date)

export const formatDayHeading = (date: Date, language: string) =>
  new Intl.DateTimeFormat(language, { weekday: 'long', day: 'numeric', month: 'long' }).format(date)

export const formatShortDateTime = (date: Date, language: string) =>
  new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)

export const formatDate = (date: Date, language: string) =>
  new Intl.DateTimeFormat(language, { day: 'numeric', month: 'long', year: 'numeric' }).format(date)

export const formatShortDate = (date: Date, language: string) =>
  new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' }).format(date)
