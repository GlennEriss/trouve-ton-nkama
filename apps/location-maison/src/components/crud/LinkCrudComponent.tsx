'use client'
import React from 'react'
import { Button } from '../ui/button'
import Link from 'next/link'
import { useCrudContext } from '@/providers/crud.provider'

export default function LinkCrudComponent() {
  const {link} = useCrudContext()
  return (
    <Button variant='outline' className='border-[#1B4D5B] text-[#1B4D5B] hover:bg-[#1B4D5B] hover:text-white' asChild>
      <Link href={link}>
        Ajouter
      </Link>
    </Button>
  )
}
