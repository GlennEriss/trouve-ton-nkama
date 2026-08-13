'use client'
import React from 'react'
import { Button } from '@trouve-ton-nkama/ui/button'
import Link from 'next/link'
import { useCrudContext } from '@/providers/crud.provider'

export default function LinkCrudComponent() {
  const {link} = useCrudContext()
  return (
    <Button variant='outline' className='border-ink text-ink hover:bg-ink hover:text-white' asChild>
      <Link href={link}>
        Ajouter
      </Link>
    </Button>
  )
}
