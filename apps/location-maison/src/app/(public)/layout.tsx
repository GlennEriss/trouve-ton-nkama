import React from 'react';
import Navbar from "@/components/home-page/Navbar";

function Layout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Navbar />
            {children}
        </>
    );
}

export default Layout;