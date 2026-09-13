jest.mock('../../src/admin', () => ({ adminDB: { __marker: 'fake-admin-db' } }))

const syncPropertyLocation = jest.fn()
jest.mock('../../src/location/location-sync.service', () => ({
  syncPropertyLocation: (...args: unknown[]) => syncPropertyLocation(...args),
}))

import { handleLocationSyncEvent } from '../../src/location/location-sync.trigger'

const VALID_AFTER = { province: 'Estuaire', city: 'Libreville', street: 'Glass' }

describe('handleLocationSyncEvent', () => {
  beforeEach(() => {
    syncPropertyLocation.mockReset()
    syncPropertyLocation.mockResolvedValue({ provinceId: 'p', cityId: 'c', streetId: 's' })
  })

  it('transmet le propertyId et la localisation normalisée au service à la création', async () => {
    await handleLocationSyncEvent('prop-1', undefined, VALID_AFTER)

    expect(syncPropertyLocation).toHaveBeenCalledTimes(1)
    expect(syncPropertyLocation).toHaveBeenCalledWith(
      { __marker: 'fake-admin-db' },
      expect.objectContaining({ province: 'Estuaire', city: 'Libreville', street: 'Glass' }),
    )
  })

  it('ne retraite pas le service lorsque la politique dit d\'ignorer (suppression)', async () => {
    await handleLocationSyncEvent('prop-1', VALID_AFTER, undefined)
    expect(syncPropertyLocation).not.toHaveBeenCalled()
  })

  it('ne retraite pas le service lorsque seul le prix change', async () => {
    await handleLocationSyncEvent('prop-1', VALID_AFTER, { ...VALID_AFTER, price: 999 })
    expect(syncPropertyLocation).not.toHaveBeenCalled()
  })

  it('journalise une erreur du service sans la relancer (pas de retry dans ce lot)', async () => {
    syncPropertyLocation.mockRejectedValue(new Error('firestore down'))
    await expect(handleLocationSyncEvent('prop-1', undefined, VALID_AFTER)).resolves.toBeUndefined()
  })

  it('ignore un document sans localisation exploitable sans appeler le service', async () => {
    await handleLocationSyncEvent('prop-1', undefined, { price: 100 })
    expect(syncPropertyLocation).not.toHaveBeenCalled()
  })

  it('synchronise lorsque la ville change (modification)', async () => {
    await handleLocationSyncEvent('prop-1', VALID_AFTER, { ...VALID_AFTER, city: 'Port-Gentil' })
    expect(syncPropertyLocation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ city: 'Port-Gentil' }),
    )
  })
})
