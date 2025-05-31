import Navbar from '@/components/home-page/Navbar';
import React from 'react';

export default async function Layout({ children }: { children: React.ReactNode }) {
    return (
        <main className='md:p-5'>
            <Navbar />
            {children}
        </main>
    );
}