import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import i18n from '../../i18n'
import type { Appointment } from '../../types/appointment'
import type { Baby } from '../../types/baby'
import type { BabyEvent } from '../../types/event'
import type { GrowthRecord } from '../../types/growth'
import { pdfText } from './pdfText'
import { buildReportDocument, REPORT_CATEGORIES, type ReportInput } from './reportDocument'
import { niceTicks, reportToPdf } from './reportPdf'
import { reportRange } from './reportPeriod'
import { reportToText } from './reportText'

const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute)
const ts = (day: number, hour: number, minute = 0) => Timestamp.fromDate(at(day, hour, minute))
const base = { comment: '', createdAt: ts(21, 0), updatedAt: ts(21, 0) }
const fr = i18n.getFixedT('fr')

const baby: Baby = {
  id: 'b1',
  name: 'Lina',
  birthDate: ts(1, 0),
  sex: null,
  avatarEmoji: '🐰',
  themeColor: null,
  archivedAt: null,
  createdAt: ts(1, 0),
  updatedAt: ts(1, 0),
}

const events: BabyEvent[] = [
  { ...base, id: 's1', type: 'sleep', occurredAt: ts(20, 22), startAt: ts(20, 22), endAt: ts(21, 6), status: 'done', details: {} },
  { ...base, id: 'b1', type: 'bottle', occurredAt: ts(21, 10), details: { consumedMl: 90, milkType: 'formula' } },
  { ...base, id: 'd1', type: 'diaper', occurredAt: ts(21, 11), comment: 'Après le bain', details: { kind: 'both' } },
]

const appointment = (id: string, concerne: string, day: number): Appointment => ({
  ...base,
  id,
  concerne,
  title: id === 'a1' ? 'Vaccin' : 'Visite maman',
  scheduledAt: ts(day, 10),
  location: 'Centre de santé',
  contact: null,
  status: 'planned',
})

const growth = (id: string, day: number, value: number): GrowthRecord => ({
  ...base,
  id,
  type: 'weight',
  label: null,
  value,
  unit: 'kg',
  measuredAt: ts(day, 12),
})

const input = (extra: Partial<ReportInput> = {}): ReportInput => ({
  baby,
  from: at(15, 0),
  to: at(22, 0),
  categories: [...REPORT_CATEGORIES],
  includeGrowthCharts: true,
  message: '',
  events,
  appointments: [appointment('a1', 'b1', 21), appointment('a2', 'mother', 21)],
  growthRecords: [growth('g1', 1, 3.45), growth('g2', 15, 4.1)],
  generatedAt: at(22, 9),
  ...extra,
})

describe('période d’un rapport (§18)', () => {
  it('jour, semaine et mois se terminent le jour choisi', () => {
    expect(reportRange('day', at(21, 15), null, null)).toEqual({ from: at(21, 0), to: at(22, 0) })
    expect(reportRange('week', at(21, 15), null, null)).toEqual({ from: at(15, 0), to: at(22, 0) })
    expect(reportRange('month', at(21, 15), null, null)?.from).toEqual(new Date(2026, 8, 22))
  })

  it('personnalisée : bornes incluses ; fin avant début ou plus d’un an refusés', () => {
    expect(reportRange('custom', null, at(10, 8), at(12, 20))).toEqual({ from: at(10, 0), to: at(13, 0) })
    expect(reportRange('custom', null, at(12, 0), at(10, 0))).toBeNull()
    expect(reportRange('custom', null, new Date(2025, 0, 1), at(12, 0))).toBeNull()
  })
})

describe('graduations du graphique PDF', () => {
  it('des valeurs rondes qui encadrent les mesures', () => {
    expect(niceTicks(3.45, 4.6)).toEqual([3, 3.5, 4, 4.5, 5])
    expect(niceTicks(52.5, 52.5)).toEqual([50, 52, 54])
  })
})

describe('texte du PDF', () => {
  it('garde les accents, remplace la typographie et retire les emoji', () => {
    expect(pdfText('Rien d’enregistré… 🍼 « bébé »')).toBe("Rien d'enregistré... « bébé »")
    expect(pdfText('1 234 ml · nœud')).toBe('1 234 ml · noeud')
    expect(pdfText('20:30 → 04:45')).toBe('20:30 à 04:45')
  })
})

describe('contenu du rapport', () => {
  it('une nuit qui traverse minuit est comptée une seule fois dans le résumé', () => {
    const doc = buildReportDocument(input(), fr, 'fr')
    const sleepRow = doc.summary?.rows.find(([label]) => label === 'Sommeil')
    expect(sleepRow?.[1]).toBe('1 sommeil · 8 h')
  })

  it('détail du plus ancien au plus récent, commentaire compris', () => {
    const doc = buildReportDocument(input(), fr, 'fr')
    expect(doc.days?.groups.map((group) => group.heading)).toEqual(['Mardi 20 octobre', 'Mercredi 21 octobre'])
    expect(doc.days?.groups[1].rows.map((row) => row[1])).toEqual(['Biberon', 'Couche'])
    expect(doc.days?.groups[1].rows[1][2]).toContain('« Après le bain »')
  })

  it('les catégories non choisies disparaissent ; seuls les rendez-vous du bébé sont repris', () => {
    const doc = buildReportDocument(input({ categories: ['bottle', 'appointments'] }), fr, 'fr')
    expect(doc.summary?.rows.map(([label]) => label)).toEqual(['Biberons'])
    expect(doc.days?.groups.flatMap((group) => group.rows.map((row) => row[1]))).toEqual(['Biberon'])
    expect(doc.appointments?.rows.map((row) => row[1])).toEqual(['Vaccin'])
    expect(doc.growth).toBeNull()
  })

  it('croissance : toutes les mesures jusqu’à la fin de la période ; graphique seulement si demandé', () => {
    expect(buildReportDocument(input(), fr, 'fr').growth?.charts).toHaveLength(1)
    expect(buildReportDocument(input({ includeGrowthCharts: false }), fr, 'fr').growth?.charts).toHaveLength(0)
    expect(buildReportDocument(input(), fr, 'fr').growth?.rows.map((row) => row[2])).toEqual(['3,45 kg', '4,1 kg'])
  })

  it('message personnel facultatif ; texte avec le rappel « aucun avis médical »', () => {
    expect(buildReportDocument(input({ message: '   ' }), fr, 'fr').message).toBeNull()
    const text = reportToText(buildReportDocument(input({ message: 'Questions pour la pédiatre' }), fr, 'fr'))
    expect(text).toContain('Rapport de suivi de Lina')
    expect(text).toContain('Questions pour la pédiatre')
    expect(text).toContain('aucun avis médical')
  })

  it('le PDF est un vrai fichier PDF', async () => {
    const blob = await reportToPdf(buildReportDocument(input({ message: 'Questions' }), fr, 'fr'))
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
    expect(bytes.length).toBeGreaterThan(3000)
  })
})
