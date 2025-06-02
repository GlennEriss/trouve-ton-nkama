import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { routes } from '@/constantes/routes';

export default function NotFound() {
  return (
    <div className="flex justify-center px-6 pb-40">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <Image
            src={'/assets/not-found.png'}
            alt="Page non trouvée"
            width={400}
            height={300}
            className="mx-auto rounded"
          />
        </div>
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <p className="text-xl font-semibold text-gray-700 mb-2">Propriété introuvable</p>
        <p className="text-gray-600 mb-6">
          La page que vous cherchez n’existe pas ou a été déplacée. Vérifiez l’URL ou explorez nos autres propriétés.
        </p>
        <Link className="inline-block px-6 py-3 bg-[#156B66] text-white font-medium rounded hover:bg-[#104f4c] transition" href={routes.public.search_property}>
            Voir les propriétés
        </Link>
      </div>
    </div>
  );
}
