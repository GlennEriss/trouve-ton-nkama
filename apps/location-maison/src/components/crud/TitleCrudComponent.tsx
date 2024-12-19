'use client'
import React from 'react'
import { CardTitle } from '../ui/card'
import { useCrudContext } from '@/providers/crud.provider'

export default function TitleCrudComponent() {
  const {title} = useCrudContext()
  return (
    <CardTitle className='text-xl text-[#1B4D5B]'>{title}</CardTitle>
  )
}
