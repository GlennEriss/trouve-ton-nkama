import { notFound } from 'next/navigation'
import React from 'react'
import { FormModifyProperty } from '@/components/stepper/FormModifyProperty';

export default async function page({params}: {params: {id?: string}}) {
  const query = await params
  if(!query?.id){
    notFound()
  }
  const id = query.id
  return (
    <FormModifyProperty id={id}/>
  )
}
