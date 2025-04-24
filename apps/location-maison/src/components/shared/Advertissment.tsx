'use client'
import { routes } from '@/constantes/routes'
import { useCurrentUser } from '@/hooks/use-current-user'
import Link from 'next/link'
import React from 'react'

export default function Advertissment() {
  const {user} = useCurrentUser()
  return (
    <div className={`bg-orange-50 border-l-4 border-orange-400 p-4 rounded-md shadow-md mt-4 ${user?.phoneNumbers?.length === 0 ? 'block': 'hidden'}`}>
      {user?.phoneNumbers?.length === 0 && (
        <div className="flex items-center justify-between gap-4">
          <div className="text-orange-800 text-sm">
            <p>
              Veuillez compléter votre profil. Les utilisateurs ne pourront pas vous contacter via vos annonces si votre numéro de téléphone est manquant.
            </p>
          </div>
          <Link href={routes.protected.profil_informations}>
            <button className="bg-orange-400 hover:bg-orange-500 text-white font-medium px-4 py-2 rounded transition duration-200">
              Compléter mon profil
            </button>
          </Link>
        </div>
      )}
    </div>
  )
}
