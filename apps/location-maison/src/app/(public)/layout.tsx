import React from 'react'
import PublicLayout from "@/components/layouts/PublicLayout";

export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <PublicLayout>
            {children}
        </PublicLayout>
    );
}