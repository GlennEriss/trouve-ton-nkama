import React from 'react'
import Navbar from "@/components/home-page/Navbar";

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className='min-h-screen'>
      <div className="sticky top-0 z-50 px-10 py-5 xl:px-20">
        <Navbar />
      </div>
      {children}
    </div>
  );
}