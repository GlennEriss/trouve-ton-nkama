import { adminAuth } from '@/firebase/admin'
import { auth } from '@/next-auth/auth'

export async function resolveAuthenticatedUid(request: Request): Promise<string | null> {
  const session = await auth().catch(() => null)
  const sessionUid = typeof session?.user?.uid === 'string' ? session.user.uid.trim() : ''
  if (sessionUid) return sessionUid

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice('Bearer '.length).trim()
  if (!token) return null

  const decoded = await adminAuth.verifyIdToken(token).catch(() => null)
  return decoded?.uid ?? null
}
