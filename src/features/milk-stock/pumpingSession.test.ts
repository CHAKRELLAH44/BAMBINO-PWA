import { describe, expect, it } from 'vitest'
import { pausePumping, pumpingDurationMs, pumpingMinutes, resumePumping, startPumping } from './pumpingSession'

const at = (minute: number, second = 0) => new Date(2026, 9, 22, 10, minute, second)

describe('chronomètre de tirage', () => {
  it('compte le temps par horodatages, pauses exclues', () => {
    let session = startPumping('both', at(0))
    session = pausePumping(session, at(8))
    session = resumePumping(session, at(12))
    expect(pumpingDurationMs(session, at(15))).toBe(11 * 60_000)
    expect(session.segments).toHaveLength(2)
  })

  it('après fermeture de l’application, la durée se recalcule avec « maintenant »', () => {
    const session = startPumping('left', at(0))
    expect(pumpingDurationMs(session, at(20))).toBe(20 * 60_000)
  })

  it('pause ou reprise sans effet dans le mauvais état ; horloge qui recule sans durée négative', () => {
    const running = startPumping('right', at(10))
    expect(resumePumping(running, at(11))).toBe(running)
    const paused = pausePumping(running, at(5))
    expect(pumpingDurationMs(paused, at(30))).toBe(0)
    expect(pausePumping(paused, at(12))).toBe(paused)
  })

  it('durée enregistrée en minutes : arrondie, au moins 1', () => {
    expect(pumpingMinutes(pausePumping(startPumping('both', at(0)), at(0, 20)), at(1))).toBe(1)
    expect(pumpingMinutes(pausePumping(startPumping('both', at(0)), at(14, 40)), at(20))).toBe(15)
    expect(pumpingMinutes(pausePumping(startPumping('both', at(0)), at(0)), at(5))).toBe(0)
  })
})
