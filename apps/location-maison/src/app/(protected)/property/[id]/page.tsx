import PreviewProperty from '@/components/preview-property/PreviewProperty'
import Advertissment from '@/components/shared/Advertissment'
import { routes } from '@/constantes/routes'
import { getPropertyById } from '@/db/property.db'
import { auth } from '@/next-auth/auth'
import { notFound, redirect } from 'next/navigation'
import React from 'react'

export default async function page({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) {
    return null
  }
  const { id } = await params
  //const id = params.id
  const property = await getPropertyById(id)
  if (!property) {
    return notFound()
  }
  if (property.createdBy !== session.user?.uid) {
    redirect('/houseDetails/' + id)
  }
  return (
    <div>
      <Advertissment/>
      <PreviewProperty property={property} />
    </div>
  )
}
