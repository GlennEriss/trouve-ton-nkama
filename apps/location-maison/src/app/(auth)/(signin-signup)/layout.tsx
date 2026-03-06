import React from 'react'
import { auth } from '@/next-auth/auth'
import { redirect } from 'next/navigation'
import { getPostAuthRedirectPath } from '@/lib/auth/role-routing'

export default async function layout({ children }: Readonly<{ children: React.ReactNode }>) {
    const session = await auth()
    if (session?.user) {
        redirect(getPostAuthRedirectPath(session.user))
    }
    return (
        <div>
            {children}
        </div>
    )
}
