import BreadCrumpComponent from '@/components/shared/BreadCrumpComponent'
import React from 'react'

export default function template({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className='flex flex-col gap-4 md:py-4 md:px-10 xl:px-20'>
      <BreadCrumpComponent hideOnMobile={true} />
      <main>
        {children}
      </main>
    </div>
  )
}
