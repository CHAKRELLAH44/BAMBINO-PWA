const pad = (value: number) => String(value).padStart(2, '0')

/** Chronomètre « mm:ss » ou « h:mm:ss » */
export function formatClock(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}

/** Heures et minutes arrondies à la minute */
export function durationParts(ms: number) {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000))
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 }
}
