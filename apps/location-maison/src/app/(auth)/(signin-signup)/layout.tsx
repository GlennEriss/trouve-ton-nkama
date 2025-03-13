import { auth } from '@/next-auth/auth'
import { redirect } from 'next/navigation'
import React from 'react'

export default async function layout({ children }: { children: React.ReactNode }) {
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
