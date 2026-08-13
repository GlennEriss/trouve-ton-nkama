import PreviewPropertyDraft from '@/components/preview-property/PreviewPropertyDraft'
import { getPropertyById } from '@/db/property.db'
import { auth } from '@/next-auth/auth'
import { notFound, redirect } from 'next/navigation'

// Même contrôle de propriété que (protected)/property/[id]/page.tsx — cette
// page n'a de sens que pour l'annonceur qui vient de créer l'annonce via
// /property/create.
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
