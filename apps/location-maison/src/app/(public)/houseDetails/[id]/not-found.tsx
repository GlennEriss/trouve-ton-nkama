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
        <p className="text-xl font-semibold text-gray-700 mb-2">Annonce introuvable</p>
        <p className="text-gray-500 mb-6">
          La page que vous cherchez n'existe pas ou a été déplacée. Vérifiez l'URL ou explorez nos autres annonces.
        </p>
        <Link href="/search" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Voir les annonces
        </Link>
      </div>
    </div>
  );
}
