'use client'
import React from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '../ui/breadcrumb';
import { routes } from '@/constantes/routes';
import { usePathname } from 'next/navigation';

export default function BreadCrumpComponent() {
  const pathname: string = usePathname();
  const pathnames = pathname.split('/').filter(Boolean);
  const getLabel = (segment: string) => {
    switch (segment) {
      case 'account':
        return 'Mon compte';
      case 'property':
        return 'Propriétés';
      case 'add':
        return 'Ajouter';
      case 'home':
        return 'Maison';
      case 'apartment':
        return 'Appartement';
      case 'studio':
        return 'Studio';
      case 'villa':
        return 'Villa';
      case 'desk':
        return 'Bureau';
      case 'building':
        return 'Immeuble';
      case 'login-and-security':
        return 'Connexion et sécurité';
      case 'modify':
        return 'Modifier';
      default:
        return segment.charAt(0).toUpperCase() + segment.slice(1);
    }
  };
  return (
    <Breadcrumb className='hidden md:block'>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink className='hover:text-[#1B4D5B]' href={routes.public.homePage}>Accueil</BreadcrumbLink>
        </BreadcrumbItem>
        {pathnames.map((segment, index) => {
          const href = '/' + pathnames.slice(0, index + 1).join('/');
          return (
            <React.Fragment key={index}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink className='hover:text-[#1B4D5B]' href={href}>
                  {getLabel(segment)}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}