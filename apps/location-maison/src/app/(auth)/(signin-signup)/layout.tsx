import React from 'react'
import { auth } from '@/next-auth/auth'
import { redirect } from 'next/navigation'

export default async function layout({ children }: Readonly<{ children: React.ReactNode }>) {
    const session = await auth()
    if (session?.user) {
        redirect('/')
    }
    return (
        <div>
            {children}
        </div>
    )
}
