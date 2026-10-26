import type { jsPDF as JsPdf } from 'jspdf'
import type { CellHookData, RowInput } from 'jspdf-autotable'
import type { BabyEventType } from '../../types/event'
import { formatShortDate } from '../../utils/formatDate'
import { pdfText } from './pdfText'
import type { GrowthChartData, ReportDocument } from './reportDocument'

type Rgb = [number, number, number]

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 15
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN
const BOTTOM_LIMIT = PAGE_HEIGHT - 22
const CONTINUATION_TOP = 20
// Couleurs de l'application (Tailwind) : le rapport a la même identité que l'écran
const ROSE: Rgb = [244, 63, 94] // rose-500
const ROSE_DARK: Rgb = [225, 29, 72] // rose-600
const ROSE_LIGHT: Rgb = [255, 241, 242] // rose-50
const ROSE_SOFT: Rgb = [255, 228, 230] // rose-100
const INK: Rgb = [30, 41, 59] // slate-800
const MUTED: Rgb = [100, 116, 139] // slate-500
const CARD: Rgb = [248, 250, 252] // slate-50
const GRID: Rgb = [226, 232, 240] // slate-200
const WHITE: Rgb = [255, 255, 255]
// Le PDF est toujours en français (§18)
const LANGUAGE = 'fr'

export type ReportIconKey = BabyEventType | 'appointment' | 'growth'

/** Images préparées par le navigateur : photo (ou avatar) du bébé et icônes de l'application, en PNG / JPEG */
export interface ReportVisuals {
  babyImage?: { data: string; format: 'JPEG' | 'PNG' } | null
  icons?: Partial<Record<ReportIconKey, string>>
}

/**
 * Rapport PDF A4 (§18) avec jsPDF et jsPDF-AutoTable, chargés seulement au moment de créer le fichier.
 * Le contenu vient de `buildReportDocument` construit en français ; la mise en page reprend l'application.
 */
export async function reportToPdf(doc: ReportDocument, visuals: ReportVisuals = {}): Promise<Blob> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const icons = visuals.icons ?? {}
  let y = 0

  const setText = (size: number, style: 'normal' | 'bold' | 'italic', color: Rgb = INK) => {
    pdf.setFont('helvetica', style)
    pdf.setFontSize(size)
    pdf.setTextColor(...color)
  }
  const ensureSpace = (height: number) => {
    if (y + height > BOTTOM_LIMIT) {
      pdf.addPage()
      y = CONTINUATION_TOP
    }
  }
  const paragraph = (text: string, size: number, color: Rgb = MUTED) => {
    setText(size, 'normal', color)
    const lines = pdf.splitTextToSize(pdfText(text), CONTENT_WIDTH) as string[]
    const height = lines.length * size * 0.45
    ensureSpace(height)
    // `text` place la ligne de base : on descend d'une hauteur de lettre
    pdf.text(lines, MARGIN, y + size * 0.35)
    y += height + 1.5
  }
  const heading = (text: string) => {
    ensureSpace(20)
    y += 7
    pdf.setFillColor(...ROSE)
    pdf.roundedRect(MARGIN, y - 4.3, 1.6, 5.6, 0.8, 0.8, 'F')
    setText(12.5, 'bold')
    pdf.text(pdfText(text), MARGIN + 4, y)
    y += 4
  }
  const icon = (key: ReportIconKey, x: number, top: number, size: number) => {
    const image = icons[key]
    if (image) pdf.addImage(image, 'PNG', x, top, size, size)
  }
  const table = (
    columns: string[],
    body: RowInput[],
    widths: number[],
    rowIcons: (ReportIconKey | null)[] = [],
    iconColumn = -1,
  ) => {
    autoTable(pdf, {
      startY: y,
      head: [columns.map(pdfText)],
      body,
      theme: 'plain',
      margin: { left: MARGIN, right: MARGIN, bottom: 22, top: CONTINUATION_TOP },
      styles: { font: 'helvetica', fontSize: 9, cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 }, textColor: INK, overflow: 'linebreak' },
      headStyles: { fillColor: ROSE_SOFT, textColor: ROSE_DARK, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: CARD },
      columnStyles: Object.fromEntries(
        widths.map((width, index) => [
          index,
          { cellWidth: width, ...(index === iconColumn ? { cellPadding: { top: 2.2, bottom: 2.2, left: 8, right: 2.5 } } : {}) },
        ]),
      ),
      // Petite icône de l'activité devant son nom, comme dans l'application
      didDrawCell: (data: CellHookData) => {
        if (data.section !== 'body' || data.column.index !== iconColumn) return
        const key = rowIcons[data.row.index]
        if (key) icon(key, data.cell.x + 2, data.cell.y + (data.cell.height - 4.2) / 2, 4.2)
      },
    })
    y = ((pdf as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y) + 3
  }
  const emptyRow = (span: number): RowInput[] => [[{ content: pdfText(doc.empty), colSpan: span, styles: { textColor: MUTED } }]]
  const cells = (row: string[]) => row.map(pdfText)

  // --- En-tête : bandeau rose, titre, période, photo du bébé ---------------------------------------
  const band = 48
  pdf.setFillColor(...ROSE)
  pdf.rect(0, 0, PAGE_WIDTH, band, 'F')
  pdf.setFillColor(251, 113, 133) // rose-400 : motif discret
  pdf.circle(PAGE_WIDTH - 8, 6, 26, 'F')
  pdf.circle(PAGE_WIDTH - 62, band + 2, 9, 'F')
  pdf.setFillColor(...WHITE)
  pdf.rect(0, band, PAGE_WIDTH, 14, 'F') // le motif ne déborde pas du bandeau

  setText(9, 'bold', WHITE)
  pdf.text(pdfText(doc.header.brand).toUpperCase(), MARGIN, 14, { charSpace: 1.2 })
  setText(21, 'bold', WHITE)
  pdf.text(pdfText(doc.header.title), MARGIN, 26)
  setText(10.5, 'normal', WHITE)
  pdf.text(pdfText(doc.header.period), MARGIN, 34.5)
  setText(8.5, 'normal', ROSE_SOFT)
  pdf.text(pdfText(doc.header.generated), MARGIN, 41)

  // Photo (ou avatar) en médaillon blanc ; à défaut, l'initiale du prénom
  const centerX = PAGE_WIDTH - MARGIN - 18
  const centerY = 24
  const radius = 17
  pdf.setFillColor(...WHITE)
  pdf.circle(centerX, centerY, radius + 1.4, 'F')
  if (visuals.babyImage) {
    pdf.saveGraphicsState()
    pdf.circle(centerX, centerY, radius, null)
    pdf.clip()
    pdf.discardPath()
    pdf.addImage(visuals.babyImage.data, visuals.babyImage.format, centerX - radius, centerY - radius, radius * 2, radius * 2)
    pdf.restoreGraphicsState()
  } else {
    pdf.setFillColor(...ROSE_LIGHT)
    pdf.circle(centerX, centerY, radius, 'F')
    setText(20, 'bold', ROSE_DARK)
    pdf.text(pdfText(doc.header.babyName).charAt(0).toUpperCase(), centerX, centerY + 3.5, { align: 'center' })
  }

  // Identité du bébé
  y = band + 12
  setText(18, 'bold')
  pdf.text(pdfText(doc.header.babyName), MARGIN, y)
  y += 6.5
  setText(10, 'normal', MUTED)
  pdf.text(pdfText(doc.header.details.join('  ·  ')), MARGIN, y)
  y += 4

  // --- Message personnel ----------------------------------------------------------------------------
  if (doc.message) {
    y += 5
    setText(10, 'italic')
    const lines = pdf.splitTextToSize(pdfText(doc.message.text), CONTENT_WIDTH - 12) as string[]
    const height = lines.length * 4.5 + 12
    ensureSpace(height)
    pdf.setFillColor(...ROSE_LIGHT)
    pdf.roundedRect(MARGIN, y, CONTENT_WIDTH, height, 2.5, 2.5, 'F')
    pdf.setFillColor(...ROSE)
    pdf.rect(MARGIN, y, 1.6, height, 'F')
    setText(9.5, 'bold', ROSE_DARK)
    pdf.text(pdfText(doc.message.title), MARGIN + 6, y + 6.5)
    setText(10, 'italic')
    pdf.text(lines, MARGIN + 6, y + 12)
    y += height
  }

  // --- Résumé en cartes -------------------------------------------------------------------------------
  if (doc.summary) {
    heading(doc.summary.title)
    y += 1
    const gap = 4
    const columns = 3
    const cardWidth = (CONTENT_WIDTH - gap * (columns - 1)) / columns
    const cardHeight = 25
    doc.cards.forEach((card, index) => {
      const column = index % columns
      if (column === 0) {
        if (index > 0) y += cardHeight + gap
        ensureSpace(cardHeight)
      }
      const x = MARGIN + column * (cardWidth + gap)
      pdf.setFillColor(...CARD)
      pdf.setDrawColor(...GRID)
      pdf.setLineWidth(0.2)
      pdf.roundedRect(x, y, cardWidth, cardHeight, 2.5, 2.5, 'FD')
      if (icons[card.kind]) icon(card.kind, x + 4, y + 4.5, 9)
      else {
        pdf.setFillColor(...ROSE_SOFT)
        pdf.circle(x + 8.5, y + 9, 4.5, 'F')
      }
      setText(8.5, 'normal', MUTED)
      pdf.text(pdfText(card.label), x + 16, y + 8)
      setText(17, 'bold')
      pdf.text(card.value, x + 16, y + 16.5)
      setText(8, 'normal', MUTED)
      const detail = (pdf.splitTextToSize(pdfText(card.detail), cardWidth - 19) as string[])[0] ?? ''
      pdf.text(detail, x + 16, y + 21.5)
    })
    if (doc.cards.length > 0) y += cardHeight + 3
    paragraph(doc.summary.note, 8)
  }

  // --- Détail jour par jour -------------------------------------------------------------------------
  if (doc.days) {
    heading(doc.days.title)
    const body: RowInput[] = []
    const rowIcons: (ReportIconKey | null)[] = []
    for (const group of doc.days.groups) {
      body.push([
        { content: pdfText(group.heading), colSpan: 3, styles: { fontStyle: 'bold', fillColor: ROSE_LIGHT, textColor: ROSE_DARK } },
      ])
      rowIcons.push(null)
      group.rows.forEach((row, index) => {
        body.push(cells(row))
        rowIcons.push(group.kinds[index] ?? null)
      })
    }
    table(doc.days.columns, body.length > 0 ? body : emptyRow(3), [17, 34], rowIcons, 1)
  }

  // --- Rendez-vous -----------------------------------------------------------------------------------
  if (doc.appointments) {
    heading(doc.appointments.title)
    const rows = doc.appointments.rows
    table(
      doc.appointments.columns,
      rows.length > 0 ? rows.map(cells) : emptyRow(3),
      [32, 60],
      rows.map(() => 'appointment'),
      1,
    )
  }

  // --- Croissance ------------------------------------------------------------------------------------
  if (doc.growth) {
    heading(doc.growth.title)
    paragraph(doc.growth.note, 8.5)
    table(doc.growth.columns, doc.growth.rows.length > 0 ? doc.growth.rows.map(cells) : emptyRow(3), [40, 60])
    for (const chart of doc.growth.charts) {
      ensureSpace(70)
      y += 3
      pdf.setFillColor(...WHITE)
      pdf.setDrawColor(...GRID)
      pdf.setLineWidth(0.25)
      pdf.roundedRect(MARGIN, y, CONTENT_WIDTH, 64, 3, 3, 'FD')
      if (icons.growth) icon('growth', MARGIN + 5, y + 4, 6)
      drawChart(pdf, chart, MARGIN + (icons.growth ? 13 : 5), y + 8.5, CONTENT_WIDTH - (icons.growth ? 18 : 10), 52)
      y += 67
    }
  }

  // --- Pages suivantes et pied de page ----------------------------------------------------------------
  const count = pdf.getNumberOfPages()
  for (let page = 1; page <= count; page += 1) {
    pdf.setPage(page)
    if (page > 1) {
      pdf.setFillColor(...ROSE)
      pdf.rect(0, 0, PAGE_WIDTH, 3, 'F')
      setText(8.5, 'bold', ROSE_DARK)
      pdf.text(pdfText(`${doc.header.title} · ${doc.header.babyName}`), MARGIN, 11)
      setText(8.5, 'normal', MUTED)
      pdf.text(pdfText(doc.header.period), PAGE_WIDTH - MARGIN, 11, { align: 'right' })
    }
    pdf.setDrawColor(...GRID)
    pdf.setLineWidth(0.3)
    pdf.line(MARGIN, PAGE_HEIGHT - 16, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 16)
    setText(7.5, 'normal', MUTED)
    pdf.text(pdf.splitTextToSize(pdfText(doc.footer), CONTENT_WIDTH - 30) as string[], MARGIN, PAGE_HEIGHT - 11)
    const label = doc.pageLabel.replace('{page}', String(page)).replace('{count}', String(count))
    setText(7.5, 'bold', ROSE_DARK)
    pdf.text(pdfText(label), PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 11, { align: 'right' })
  }

  return pdf.output('blob')
}

/** Courbe d'une mesure : les valeurs saisies reliées par des segments droits, sans courbe de référence (§15) */
function drawChart(pdf: JsPdf, chart: GrowthChartData, x: number, y: number, width: number, height: number) {
  const number = (value: number) => pdfText(new Intl.NumberFormat(LANGUAGE, { maximumFractionDigits: 2 }).format(value))
  const values = chart.points.map((point) => point.value)
  const times = chart.points.map((point) => point.time)
  const ticks = niceTicks(Math.min(...values), Math.max(...values))
  const low = ticks[0]
  const high = ticks[ticks.length - 1]
  const firstTime = Math.min(...times)
  const lastTime = Math.max(...times)

  const left = x + 12
  const right = x + width - 6
  const top = y + 6
  const bottom = y + height - 8
  const toX = (time: number) => left + ((time - firstTime) / (lastTime - firstTime || 1)) * (right - left)
  const toY = (value: number) => bottom - ((value - low) / (high - low)) * (bottom - top)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(...INK)
  pdf.text(pdfText(chart.title), x, y)

  // Grille horizontale et graduations
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(...MUTED)
  pdf.setDrawColor(...GRID)
  pdf.setLineWidth(0.2)
  for (const value of ticks) {
    const lineY = toY(value)
    pdf.line(left, lineY, right, lineY)
    pdf.text(number(value), left - 2, lineY + 1, { align: 'right' })
  }
  pdf.text(pdfText(formatShortDate(new Date(firstTime), LANGUAGE)), left, bottom + 5)
  pdf.text(pdfText(formatShortDate(new Date(lastTime), LANGUAGE)), right, bottom + 5, { align: 'right' })

  // Courbe et points
  pdf.setDrawColor(...ROSE_DARK)
  pdf.setLineWidth(0.7)
  chart.points.forEach((point, index) => {
    if (index > 0) {
      const previous = chart.points[index - 1]
      pdf.line(toX(previous.time), toY(previous.value), toX(point.time), toY(point.value))
    }
  })
  for (const point of chart.points) {
    pdf.setFillColor(...WHITE)
    pdf.circle(toX(point.time), toY(point.value), 1.5, 'F')
    pdf.setFillColor(...ROSE_DARK)
    pdf.circle(toX(point.time), toY(point.value), 1.05, 'F')
  }

  // Seule la dernière valeur est écrite
  const last = chart.points[chart.points.length - 1]
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(...INK)
  pdf.text(`${number(last.value)} ${pdfText(chart.unit)}`, toX(last.time), toY(last.value) - 3, { align: 'right' })
}

/** Graduations « rondes » (1, 2, 2,5 ou 5 × 10ⁿ) qui encadrent les valeurs : 3 à 6 lignes */
export function niceTicks(min: number, max: number): number[] {
  const span = max - min || Math.abs(max) * 0.1 || 1
  const rough = span / 3
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= rough)!
  const first = Math.floor((min - span * 0.05) / step) * step
  const last = Math.ceil((max + span * 0.05) / step) * step
  const ticks: number[] = []
  for (let value = first; value <= last + step / 2; value += step) ticks.push(Math.round(value / step) * step)
  while (ticks.length < 3) ticks.unshift(ticks[0] - step)
  return ticks
}
