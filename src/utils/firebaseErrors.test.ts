import { FirebaseError } from 'firebase/app'
import { describe, expect, it } from 'vitest'
import { saveErrorKey } from './firebaseErrors'

describe('saveErrorKey', () => {
  it('un refus des règles de sécurité est signalé clairement', () => {
    const key = saveErrorKey(new FirebaseError('permission-denied', 'Missing or insufficient permissions.'))
    expect(key).toBe(import.meta.env.DEV ? 'common.permissionDeniedDev' : 'common.permissionDenied')
  })

  it('hors ligne', () => {
    expect(saveErrorKey(new FirebaseError('unavailable', 'offline'))).toBe('common.offline')
  })

  it('toute autre erreur reste générique', () => {
    expect(saveErrorKey(new Error('boom'))).toBe('common.saveError')
    expect(saveErrorKey(undefined)).toBe('common.saveError')
  })
})
