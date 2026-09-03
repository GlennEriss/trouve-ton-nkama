export {};
let POST: typeof import('@/app/api/advertising/upload/route').POST

let authResult: any
const save = jest.fn(async () => undefined)
const bucketFile = jest.fn(() => ({ save }))
const bucket = jest.fn(() => ({ name: 'bucket-1', file: bucketFile }))

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => payload,
    }),
  },
}))
jest.mock('@/next-auth/auth', () => ({ auth: jest.fn(async () => authResult) }))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ error: jest.fn() }) }))
jest.mock('@/firebase/admin', () => ({ adminApp: { name: 'admin' } }))
jest.mock('firebase-admin/storage', () => ({ getStorage: () => ({ bucket }) }))

function requestWith(form: { get: (k: string) => unknown } | null) {
  return {
    formData: async () => {
      if (!form) throw new Error('bad multipart')
      return form
    },
  } as any
}
function pngFile() {
  const f = new File([new Uint8Array([1, 2, 3])], 'ad.png', { type: 'image/png' })
  // jsdom File n'implemente pas toujours arrayBuffer(): on le garantit sans casser instanceof File.
  if (typeof (f as any).arrayBuffer !== 'function') {
    Object.defineProperty(f, 'arrayBuffer', { value: async () => new Uint8Array([1, 2, 3]).buffer })
  }
  return f
}

describe('/api/advertising/upload', () => {
  beforeAll(async () => {
    ;({ POST } = await import('@/app/api/advertising/upload/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
    authResult = { user: { uid: 'u1' } }
  })

  it('exige une session', async () => {
    authResult = null
    const response = await POST(requestWith({ get: () => pngFile() }))
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' } })
  })

  it('rejette une requete multipart invalide', async () => {
    const response = await POST(requestWith(null))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
  })

  it('rejette un fichier manquant', async () => {
    const response = await POST(requestWith({ get: () => null }))
    expect(response.status).toBe(400)
  })

  it('rejette un format non supporte', async () => {
    const bad = new File([new Uint8Array([1])], 'ad.svg', { type: 'image/svg+xml' })
    const response = await POST(requestWith({ get: () => bad }))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
  })

  it('uploade le visuel et renvoie 201 avec une URL de telechargement', async () => {
    const response = await POST(requestWith({ get: () => pngFile() }))
    expect(response.status).toBe(201)
    const payload = await response.json()
    expect(payload.success).toBe(true)
    expect(payload.imagePATH).toMatch(/^ad-campaigns\/u1\/.*\.png$/)
    expect(payload.imageURL).toContain('firebasestorage.googleapis.com')
    expect(save).toHaveBeenCalledTimes(1)
    const [, options] = save.mock.calls[0] as unknown[]
    expect(options).toMatchObject({ contentType: 'image/png', resumable: false })
  })

  it('resout le bucket par son nom explicite, jamais storage.bucket() sans argument', async () => {
    // Bug reel corrige le 2026-09-02 (trouve en ecrivant le premier e2e reel, non mocke, de ce
    // parcours) : storage.bucket() sans argument fait deviner au SDK Admin l'ancienne
    // convention {project-id}.appspot.com, qui ne correspond pas au vrai bucket de ce projet
    // (*.firebasestorage.app, voir NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) — tout upload de
    // visuel publicitaire echouait reellement en dev/prod malgre cette suite Jest verte, car
    // ce mock accepte n'importe quel nombre d'arguments sans distinguer les deux cas. Fixe la
    // variable ici plutot que de compter sur l'environnement ambiant (non garanti sous Jest).
    const originalBucketEnv = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'trouve-ton-nkama-test.firebasestorage.app'
    try {
      await POST(requestWith({ get: () => pngFile() }))

      expect(bucket).toHaveBeenCalledTimes(1)
      expect(bucket).toHaveBeenCalledWith('trouve-ton-nkama-test.firebasestorage.app')
    } finally {
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = originalBucketEnv
    }
  })

  it('traduit un echec de stockage en 500', async () => {
    save.mockRejectedValueOnce(new Error('gcs down'))
    const response = await POST(requestWith({ get: () => pngFile() }))
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ error: { code: 'INTERNAL_ERROR' } })
  })
})
