import React from 'react';
import Navbar from "@/components/home-page/Navbar";
import { auth } from '@/next-auth/auth';

export default async function Layout({ children }: { children: React.ReactNode }) {
    const session = await auth()
    return (
        <>
            <Navbar session={session} />
            {children}
        </>
    );
}