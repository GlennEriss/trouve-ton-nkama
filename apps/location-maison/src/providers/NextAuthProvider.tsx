import React from 'react'
import { auth } from '@/next-auth/auth';
import { SessionProvider } from 'next-auth/react';

export default async function NextAuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const session = await auth()
    return (
        <SessionProvider session={session}>
            {children}
        </SessionProvider>
    )
}
