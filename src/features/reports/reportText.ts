import type { ReportDocument } from './reportDocument'

/** Rapport en texte simple (§18), à copier ou partager : même contenu que le PDF */
export function reportToText(doc: ReportDocument): string {
  const lines: string[] = [doc.title, ...doc.info]
  const section = (title: string) => lines.push('', `== ${title} ==`)

  if (doc.message) {
    lines.push('', `${doc.message.title}${doc.colon}`, doc.message.text)
  }
  if (doc.summary) {
    section(doc.summary.title)
    for (const [label, value] of doc.summary.rows) lines.push(`${label}${doc.colon} ${value}`)
    lines.push(doc.summary.note)
  }
  if (doc.days) {
    section(doc.days.title)
    if (doc.days.groups.length === 0) lines.push(doc.empty)
    for (const group of doc.days.groups) {
      lines.push(group.heading)
      for (const [time, activity, detail] of group.rows) lines.push(`  ${time} · ${activity} · ${detail}`)
    }
  }
  if (doc.appointments) {
    section(doc.appointments.title)
    if (doc.appointments.rows.length === 0) lines.push(doc.empty)
    for (const row of doc.appointments.rows) lines.push(row.filter(Boolean).join(' · '))
  }
  if (doc.growth) {
    section(doc.growth.title)
    lines.push(doc.growth.note)
    if (doc.growth.rows.length === 0) lines.push(doc.empty)
    for (const row of doc.growth.rows) lines.push(row.join(' · '))
  }
  lines.push('', doc.footer)
  return lines.join('\n')
}
