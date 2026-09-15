import PreviewPropertyDraft from '@/components/preview-property/PreviewPropertyDraft'
import { getPropertyById } from '@/db/property.db'
import { auth } from '@/next-auth/auth'
import { notFound, redirect } from 'next/navigation'
import type { Property } from '@/models/annonce'

// `getPropertyById` (Admin SDK) renvoie de vraies instances Timestamp pour les champs datés
// (createdAt, updatedAt, sortTimestamp...) — Next.js refuse de les faire traverser la
// frontière Server -> Client Component ("Only plain objects... Objects with toJSON methods
// are not supported"), ce qui casse silencieusement PreviewPropertyDraft (observé en e2e,
// property-edit-type-details.spec.ts : le champ concerné devenait injoignable/undefined).
// Même correctif que mapDocToPublicProperty dans src/lib/seo/public-listings.ts, dupliqué ici
// (pas d'export partagé) pour ne pas élargir ce patch à `getPropertyById` lui-même, utilisé
// ailleurs sans jamais croiser cette frontière.
function toPlainValue(value: unknown): unknown {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value
  }

  const seconds = (value as { seconds?: unknown }).seconds
  const nanoseconds = (value as { nanoseconds?: unknown }).nanoseconds
  if (typeof seconds === 'number' && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    return { seconds, nanoseconds: typeof nanoseconds === 'number' ? nanoseconds : 0 }
  }

  if (Array.isArray(value)) {
    return value.map(toPlainValue)
  }

  return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, toPlainValue(nested)]))
}

// Même contrôle de propriété que (protected)/property/[id]/page.tsx. Sert à la fois juste
// après création (/property/create) et comme cible du bouton "Modifier" de la gestion des
// annonces pour toute annonce immobilière (APPROVED ou REJECTED) — voir PreviewPropertyDraft.tsx.
export default async function CreatePropertyPreviewPage({ params }: { params: Promise<{ id?: string }> }) {
  const { id } = await params

  if (!id) {
    notFound()
  }

  const [session, property] = await Promise.all([
    auth().catch(() => null),
    getPropertyById(id),
  ])

  if (!property) {
    notFound()
  }

  if (property.createdBy !== session?.user?.uid) {
    redirect(`/annonce/${id}`)
  }

  return <PreviewPropertyDraft property={toPlainValue(property) as Property} />
}
