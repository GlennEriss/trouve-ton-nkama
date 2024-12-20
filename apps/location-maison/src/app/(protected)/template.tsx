import BreadCrumpComponent from '@/components/breadcrumps/BreadCrumpComponent'
import React from 'react'

export default function template({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex flex-col gap-4 py-4 px-4 md:px-10 xl:px-20'>
      <BreadCrumpComponent />
      <main>
        {children}
      </main>
    </div>
  )
}
