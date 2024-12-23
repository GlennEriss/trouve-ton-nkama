import Navbar from '@/components/navbar/Navbar'
import { routes } from '@/constantes/routes'
import { auth } from '@/next-auth/auth'
import { redirect } from 'next/navigation'
import React from 'react'

export default async function layout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) {
    redirect(routes.public.signin)
  }
  return (
    <div className='min-h-screen'>
      <Navbar />
      {children}
    </div>
  )
}
