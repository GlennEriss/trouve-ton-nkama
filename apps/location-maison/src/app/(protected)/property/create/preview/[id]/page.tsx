import PreviewPropertyDraft from '@/components/preview-property/PreviewPropertyDraft'
import { getPropertyById } from '@/db/property.db'
import { auth } from '@/next-auth/auth'
import { notFound, redirect } from 'next/navigation'

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

  return <PreviewPropertyDraft property={property} />
}
