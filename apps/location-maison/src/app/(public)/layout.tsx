import Navbar from '@/components/home-page/Navbar';
import React from 'react';

export default async function Layout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Navbar />
            {children}
        </>
    );
}