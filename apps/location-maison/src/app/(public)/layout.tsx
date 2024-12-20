import React from 'react';
import Navbar from "@/components/Navbar";

function Layout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Navbar />
            {children}
        </>
    );
}

export default Layout;