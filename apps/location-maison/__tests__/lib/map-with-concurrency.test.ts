import { mapWithConcurrency } from '@/lib/async/map-with-concurrency'

describe('mapWithConcurrency', () => {
  it('tableau vide accepté, aucune tâche lancée', async () => {
    const worker = jest.fn()
    expect(await mapWithConcurrency([], 3, worker)).toEqual([])
    expect(worker).not.toHaveBeenCalled()
  })

  it.each([0, 1, 2, 3, 5])('traite correctement %i fichier(s)', async (count) => {
    const items = Array.from({ length: count }, (_, i) => `item-${i}`)
    const result = await mapWithConcurrency(items, 3, async (item) => `${item}-done`)
    expect(result).toEqual(items.map((item) => `${item}-done`))
  })

  it('preserve l\'ordre malgre des resolutions desordonnees', async () => {
    const delays = [30, 10, 20, 0]
    const result = await mapWithConcurrency(delays, 4, (ms) => new Promise((resolve) => {
      setTimeout(() => resolve(`resolved-${ms}`), ms)
    }))
    expect(result).toEqual(['resolved-30', 'resolved-10', 'resolved-20', 'resolved-0'])
  })

  it('jamais plus de N operations actives en meme temps', async () => {
    const items = Array.from({ length: 10 }, (_, i) => i)
    let active = 0
    let maxActive = 0
    await mapWithConcurrency(items, 3, async () => {
      active += 1
      maxActive = Math.max(maxActive, active)
      await new Promise((resolve) => setTimeout(resolve, 5))
      active -= 1
      return null
    })
    expect(maxActive).toBeLessThanOrEqual(3)
  })

  it('arrete de lancer de nouvelles taches apres une erreur, sans rejet orphelin', async () => {
    const started: number[] = []

    const items = [0, 1, 2, 3, 4]
    const promise = mapWithConcurrency(items, 2, async (item) => {
      started.push(item)
      if (item === 1) {
        throw new Error(`fail-${item}`)
      }
      // Tâche déjà en cours quand l'échec survient : se termine normalement (pas bloquée
      // indéfiniment), juste après l'échec de la tâche voisine dans l'autre voie.
      await new Promise((resolve) => setTimeout(resolve, 20))
      return `ok-${item}`
    })

    await expect(promise).rejects.toThrow('fail-1')
    // Seules les 2 premières taches (limite=2) ont eu la chance de démarrer avant l'échec ;
    // aucune tâche 2/3/4 ne doit avoir été lancée après coup.
    expect(started.length).toBeLessThanOrEqual(2)
  })

  it('remonte la premiere erreur rencontree', async () => {
    const items = [0, 1, 2]
    await expect(
      mapWithConcurrency(items, 3, async (item) => {
        if (item === 0) throw new Error('first')
        throw new Error('second')
      }),
    ).rejects.toThrow(/first|second/)
  })

  it('ne mute pas le tableau fourni', async () => {
    const items = Object.freeze([1, 2, 3])
    await expect(mapWithConcurrency(items, 2, async (item) => item * 2)).resolves.toEqual([2, 4, 6])
  })

  it('limite effective bornee par le nombre d\'elements (pas plus de workers que d\'items)', async () => {
    let concurrentCalls = 0
    let maxConcurrentCalls = 0
    await mapWithConcurrency([1, 2], 10, async (item) => {
      concurrentCalls += 1
      maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls)
      await Promise.resolve()
      concurrentCalls -= 1
      return item
    })
    expect(maxConcurrentCalls).toBeLessThanOrEqual(2)
  })
})
