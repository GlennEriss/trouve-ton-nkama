import PreviewPropertyClient from '@/components/preview-property/PreviewPropertyClient'
import { getPropertyById } from '@/db/property.db'
import { auth } from '@/next-auth/auth'
import { notFound, redirect } from 'next/navigation'
import React from 'react'

export default async function page({ params }: { params: Promise<{ id?: string }> }) {
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

  return (
    <PreviewPropertyClient />
  )
}
