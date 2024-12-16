import {RegisterSuccess} from '@/components/signup/RegisterSuccess'
import { notFound } from 'next/navigation'
import React from 'react'

export default async function page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
     const query= await searchParams
     const uid: string = query?.uid as string
    if (!uid) {
        notFound()
    }
    return (
        <RegisterSuccess uid={uid}/>
    )
}
