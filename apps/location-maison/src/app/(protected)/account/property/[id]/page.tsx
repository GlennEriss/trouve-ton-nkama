import PreviewProperty from '@/components/preview-property/PreviewProperty'
import { getPropertyById } from '@/db/property.db'
import { notFound } from 'next/navigation'
import React from 'react'

export default async function page({params}: {params:Promise<{id: string}>}) {
  const {id} = await params
  //const id = params.id
  const property = await getPropertyById(id)
  if(!property){
    return notFound()
  }
  console.log(property)
  return (
    <PreviewProperty property={property}/>
  )
}
