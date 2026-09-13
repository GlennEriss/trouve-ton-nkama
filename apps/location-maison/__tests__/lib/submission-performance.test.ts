import { createSubmissionPerformanceTracker } from '@/lib/observability/submission-performance'

function makeClock(values: number[]) {
  let i = 0
  return { now: () => values[Math.min(i++, values.length - 1)] }
}

describe('SubmissionPerformanceTracker', () => {
  it('calcule les durées avec une horloge injectée (déterministe)', () => {
    const records: any[] = []
    const tracker = createSubmissionPerformanceTracker({
      clock: makeClock([1000, 1250]),
      transport: (record) => records.push(record),
    })

    tracker.start('image_upload')
    tracker.end('image_upload', { status: 'success' })

    expect(records).toHaveLength(1)
    expect(records[0].durationMs).toBe(250)
  })

  it('distingue des phases répétées ou imbriquées par index', () => {
    const records: any[] = []
    const tracker = createSubmissionPerformanceTracker({
      clock: makeClock([0, 100, 50, 300]),
      transport: (record) => records.push(record),
    })

    tracker.start('image_upload', 0)
    tracker.start('image_upload', 1)
    tracker.end('image_upload', { index: 0, status: 'success' })
    tracker.end('image_upload', { index: 1, status: 'success' })

    // Ordre des appels : start(0)@0, start(1)@100, end(0)@50, end(1)@300.
    expect(records.map((r) => r.index)).toEqual([0, 1])
    expect(records[0].durationMs).toBe(50)
    expect(records[1].durationMs).toBe(200)
  })

  it('enregistre la fin de phase même après une erreur', () => {
    const records: any[] = []
    const tracker = createSubmissionPerformanceTracker({
      clock: makeClock([0, 10]),
      transport: (record) => records.push(record),
    })

    tracker.start('ai')
    tracker.end('ai', { status: 'error', errorCode: 'AI_PROVIDER_ERROR' })

    expect(records[0]).toMatchObject({ status: 'error', errorCode: 'AI_PROVIDER_ERROR' })
  })

  it('measure() enregistre le succès et propage le résultat', async () => {
    const records: any[] = []
    const tracker = createSubmissionPerformanceTracker({
      clock: makeClock([0, 5]),
      transport: (record) => records.push(record),
    })

    const result = await tracker.measure('property_write', async () => 'property-1')

    expect(result).toBe('property-1')
    expect(records[0]).toMatchObject({ phase: 'property_write', status: 'success' })
  })

  it('measure() enregistre l\'échec ET relance l\'erreur d\'origine', async () => {
    const records: any[] = []
    const tracker = createSubmissionPerformanceTracker({
      clock: makeClock([0, 5]),
      transport: (record) => records.push(record),
    })

    await expect(
      tracker.measure(
        'property_write',
        async () => {
          throw new Error('firestore down')
        },
        { errorCode: () => 'FIRESTORE_ERROR' },
      ),
    ).rejects.toThrow('firestore down')

    expect(records[0]).toMatchObject({ status: 'error', errorCode: 'FIRESTORE_ERROR' })
  })

  it('émission non bloquante : une panne de transport ne remonte jamais à l\'appelant', () => {
    const tracker = createSubmissionPerformanceTracker({
      clock: makeClock([0, 1]),
      transport: () => {
        throw new Error('telemetry offline')
      },
    })

    tracker.start('validation')
    expect(() => tracker.end('validation', { status: 'success' })).not.toThrow()
  })

  it('retire les clés interdites des dimensions avant émission', () => {
    const records: any[] = []
    const tracker = createSubmissionPerformanceTracker({
      clock: makeClock([0, 1]),
      transport: (record) => records.push(record),
      dimensions: { journeyType: 'property', uid: 'user-123', city: 'Libreville' },
    })

    tracker.start('validation')
    tracker.end('validation', {
      status: 'success',
      dimensions: { fileCount: 3, description: 'texte utilisateur sensible', phone: '+24166000000' },
    })

    const keys = Object.keys(records[0].dimensions)
    expect(keys).toEqual(expect.arrayContaining(['journeyType', 'fileCount']))
    expect(keys).not.toEqual(expect.arrayContaining(['uid', 'city', 'description', 'phone']))
  })

  it('ne contient aucune valeur personnelle dans le payload final', () => {
    const records: any[] = []
    const tracker = createSubmissionPerformanceTracker({
      clock: makeClock([0, 1]),
      transport: (record) => records.push(record),
    })

    tracker.start('image_upload')
    tracker.end('image_upload', {
      status: 'success',
      dimensions: { fileName: 'photo-de-vacances.jpg', address: '12 rue Akébé', latitude: 0.39 },
    })

    expect(JSON.stringify(records[0])).not.toMatch(/photo-de-vacances|Akébé|0\.39/)
  })

  it('cleanup() retire les marques de phases restées ouvertes', () => {
    const records: any[] = []
    const tracker = createSubmissionPerformanceTracker({
      clock: makeClock([0, 100]),
      transport: (record) => records.push(record),
    })

    tracker.start('video_upload')
    tracker.cleanup()
    tracker.end('video_upload', { status: 'success' })

    // Le start() a été effacé par cleanup() : la durée repart de zéro (aucun startedAt trouvé).
    expect(records[0].durationMs).toBe(0)
  })

  it('conserve le même submissionId sur toutes les phases d\'une soumission', () => {
    const records: any[] = []
    const tracker = createSubmissionPerformanceTracker({
      clock: makeClock([0, 1, 2, 3]),
      transport: (record) => records.push(record),
    })

    tracker.start('validation')
    tracker.end('validation', { status: 'success' })
    tracker.start('property_write')
    tracker.end('property_write', { status: 'success' })

    expect(records[0].submissionId).toBe(tracker.submissionId)
    expect(records[1].submissionId).toBe(tracker.submissionId)
  })

  it('génère un nouvel identifiant à chaque nouvelle tentative (nouveau tracker)', () => {
    const first = createSubmissionPerformanceTracker()
    const second = createSubmissionPerformanceTracker()
    expect(first.submissionId).not.toBe(second.submissionId)
  })
})
