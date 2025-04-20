"use client"; // 💡 Ajoute cette ligne en haut du fichier

import Navbar from '@/components/navbar/Navbar'
import { routes } from '@/constantes/routes'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Layout({ children }: { children: React.ReactNode }) {
  /* const { data: session, status } = useSession(); 
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(routes.public.signin); 
    }
  }, [status]);

  if (status === "loading") return null; */

  return (
    <div className='min-h-screen'>
      <Navbar />
      {children}
    </div>
  );
}