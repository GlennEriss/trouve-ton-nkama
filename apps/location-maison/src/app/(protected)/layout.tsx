import Navbar from '@/components/navbar/Navbar'
import React from 'react'

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <div className='min-h-screen'>
      <Navbar />
      {children}
    </div>
  )
}
