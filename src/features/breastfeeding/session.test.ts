import { describe, expect, it } from 'vitest'
import {
  finishSession,
  openSegment,
  pauseSession,
  resumeSession,
  sessionDurations,
  startSession,
  switchSide,
  validateSegments,
} from './session'

const at = (minutes: number, seconds = 0) => new Date(2026, 9, 21, 10, minutes, seconds)
const MIN = 60_000

describe('séance d’allaitement (§7.1)', () => {
  it('commencer ouvre un segment sur le sein choisi', () => {
    const session = startSession('left', at(0))
    expect(session.status).toBe('running')
    expect(openSegment(session)).toEqual({ side: 'left', startAt: at(0), endAt: null })
  })

  it('durée juste après 2 minutes téléphone verrouillé (calcul par horodatage)', () => {
    const session = startSession('left', at(0))
    // Aucun « tic » pendant le verrouillage : seul l'horodatage de départ compte
    expect(sessionDurations(session, at(2)).total).toBe(2 * MIN)
  })

  it('changer de sein ne compte jamais deux durées en même temps', () => {
    let session = startSession('left', at(0))
    session = switchSide(session, at(5))
    session = switchSide(session, at(12))
    const open = session.segments.filter((segment) => segment.endAt === null)
    expect(open).toHaveLength(1)
    expect(sessionDurations(session, at(15))).toEqual({ left: 8 * MIN, right: 7 * MIN, total: 15 * MIN })
  })

  it('la pause n’est pas comptée, reprendre rouvre le même sein', () => {
    let session = startSession('right', at(0))
    session = pauseSession(session, at(4))
    expect(session.status).toBe('paused')
    expect(openSegment(session)).toBeNull()
    session = resumeSession(session, at(10))
    expect(openSegment(session)?.side).toBe('right')
    expect(sessionDurations(session, at(13)).total).toBe(7 * MIN)
  })

  it('changer de sein pendant une pause relance sur l’autre sein', () => {
    let session = pauseSession(startSession('left', at(0)), at(3))
    session = switchSide(session, at(6))
    expect(session.status).toBe('running')
    expect(openSegment(session)?.side).toBe('right')
    expect(sessionDurations(session, at(8))).toEqual({ left: 3 * MIN, right: 2 * MIN, total: 5 * MIN })
  })

  it('terminer ferme le segment ouvert et fige la durée', () => {
    const session = finishSession(switchSide(startSession('left', at(0)), at(6)), at(10))
    expect(session.status).toBe('done')
    expect(openSegment(session)).toBeNull()
    expect(sessionDurations(session, at(59)).total).toBe(10 * MIN)
  })

  it('reprise après fermeture de l’app : la séance relue donne la même durée', () => {
    const saved = switchSide(startSession('left', at(0)), at(5))
    const reloaded = JSON.parse(JSON.stringify(saved), (key, value) =>
      key === 'startAt' || key === 'endAt' ? (value ? new Date(value) : null) : value,
    )
    expect(sessionDurations(reloaded, at(9))).toEqual(sessionDurations(saved, at(9)))
  })

  it('une horloge qui recule ne donne jamais de durée négative', () => {
    const session = finishSession(startSession('left', at(10)), at(5))
    expect(sessionDurations(session, at(20)).total).toBe(0)
  })

  it('actions impossibles sans effet (reprendre en cours, mettre en pause une séance finie)', () => {
    const running = startSession('left', at(0))
    expect(resumeSession(running, at(1))).toBe(running)
    const done = finishSession(running, at(2))
    expect(pauseSession(done, at(3))).toBe(done)
    expect(switchSide(done, at(3))).toBe(done)
  })
})

describe('saisie manuelle des segments (§7.3)', () => {
  it('accepte des segments terminés et dans l’ordre', () => {
    expect(
      validateSegments([
        { side: 'left', startAt: at(0), endAt: at(10) },
        { side: 'right', startAt: at(10), endAt: at(18) },
      ]),
    ).toBeNull()
  })

  it('refuse vide, fin manquante, fin avant début, chevauchement', () => {
    expect(validateSegments([])).toBe('empty')
    expect(validateSegments([{ side: 'left', startAt: at(0), endAt: null }])).toBe('missingEnd')
    expect(validateSegments([{ side: 'left', startAt: at(10), endAt: at(5) }])).toBe('endBeforeStart')
    expect(
      validateSegments([
        { side: 'left', startAt: at(0), endAt: at(10) },
        { side: 'right', startAt: at(8), endAt: at(15) },
      ]),
    ).toBe('overlap')
  })
})
