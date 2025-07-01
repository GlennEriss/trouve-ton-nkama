'use client'
import React from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '../ui/breadcrumb';
import { routes } from '@/constantes/routes';
import { usePathname } from 'next/navigation';

// Mapping des segments vers leurs labels français
const SEGMENT_LABELS: Record<string, string> = {
  'account': 'Mon compte',
  'property': 'Propriétés',
  'add': 'Ajouter',
  'home': 'Maison',
  'apartment': 'Appartement',
  'studio': 'Studio',
  'villa': 'Villa',
  'desk': 'Bureau',
  'building': 'Immeuble',
  'login-and-security': 'Connexion et sécurité',
  'modify': 'Modifier'
};

export default function BreadCrumpComponent() {
  const pathname: string = usePathname();
  const pathnames = pathname.split('/').filter(Boolean);

  // Fonction pour obtenir le label d'un segment
  const getLabel = (segment: string): string => {
    return SEGMENT_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  // Fonction pour créer un élément de breadcrumb
  const createBreadcrumbItem = (segment: string, index: number) => {
    const href = '/' + pathnames.slice(0, index + 1).join('/');
    const label = getLabel(segment);

    return (
      <React.Fragment key={href}>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink className='hover:text-[#1B4D5B]' href={href}>
            {label}
          </BreadcrumbLink>
        </BreadcrumbItem>
      </React.Fragment>
    );
  };

  return (
    <Breadcrumb className='hidden md:block'>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink className='hover:text-[#1B4D5B]' href={routes.public.homePage}>
            Accueil
          </BreadcrumbLink>
        </BreadcrumbItem>
        {pathnames.map(createBreadcrumbItem)}
      </BreadcrumbList>
    </Breadcrumb>
  );
}