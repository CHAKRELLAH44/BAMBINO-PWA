// Les polices standard de jsPDF ne connaissent que l'alphabet latin occidental (Latin-1) :
// on remplace les signes typographiques courants et on retire le reste (emoji…).
const REPLACEMENTS: [RegExp, string][] = [
  [/[‘’ʼ]/g, "'"],
  [/[“”]/g, '"'],
  [/…/g, '...'],
  [/[–—]/g, '-'],
  // « 20:30 → 04:45 » se lit « 20:30 à 04:45 »
  [/ ?→ ?/g, ' à '],
  [/[   ]/g, ' '],
  [/œ/g, 'oe'],
  [/Œ/g, 'OE'],
]

/** Texte prêt pour le PDF en français : accents gardés, caractères hors Latin-1 remplacés ou retirés */
export function pdfText(text: string): string {
  let result = text
  for (const [pattern, replacement] of REPLACEMENTS) result = result.replace(pattern, replacement)
  return Array.from(result)
    .filter((character) => character.codePointAt(0)! <= 0xff)
    .join('')
    .replace(/ {2,}/g, ' ')
    .trim()
}
