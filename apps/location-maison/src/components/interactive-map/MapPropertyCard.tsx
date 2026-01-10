'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Home, MapPin, Maximize } from 'lucide-react';
import type { Property } from '@/providers/MapCacheProvider';

interface MapPropertyCardProps {
  property: Property;
  isHighlighted?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function MapPropertyCard({ 
  property, 
  isHighlighted = false,
  onMouseEnter,
  onMouseLeave 
}: MapPropertyCardProps) {
  // Formater le prix
  const formatPrice = (price?: number) => {
    if (!price) return 'Prix sur demande';
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  // Obtenir l'image principale
  const mainImage = property.images?.[0] || '/assets/placeholder-property.webp';

  // Obtenir le type de propriété formaté
  const getPropertyType = (type?: string) => {
    const types: Record<string, string> = {
      home: 'Maison',
      apartment: 'Appartement',
      studio: 'Studio',
      villa: 'Villa',
      land: 'Terrain',
      building: 'Immeuble',
      room: 'Chambre',
      shop: 'Boutique',
      desk: 'Bureau',
      kiosk: 'Kiosque',
    };
    return types[type || ''] || type || 'Logement';
  };

  return (
    <Link 
      href={`/houseDetails/${property.objectID || property.id}`}
      className={`block transition-all duration-200 ${isHighlighted ? 'ring-2 ring-[#146B67] scale-[1.02]' : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100 dark:border-gray-700">
        {/* Image */}
        <div className="relative h-32 w-full">
          <Image
            src={mainImage}
            alt={property.title || property.name || 'Propriété'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 300px"
          />
          
          {/* Badge type */}
          <div className="absolute top-2 left-2">
            <span className="bg-[#146B67] text-white text-xs px-2 py-1 rounded-full">
              {getPropertyType(property.typeProperty)}
            </span>
          </div>
          
          {/* Badge statut */}
          {property.status && (
            <div className="absolute top-2 right-2">
              <span className={`text-xs px-2 py-1 rounded-full ${
                property.status === 'À louer' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-orange-500 text-white'
              }`}>
                {property.status}
              </span>
            </div>
          )}
        </div>
        
        {/* Contenu */}
        <div className="p-3">
          {/* Prix */}
          <p className="text-[#146B67] font-bold text-lg">
            {formatPrice(property.price)}
            {property.status === 'À louer' && <span className="text-sm font-normal">/mois</span>}
          </p>
          
          {/* Titre */}
          <h3 className="font-medium text-gray-900 dark:text-white truncate mt-1">
            {property.title || property.name || 'Propriété'}
          </h3>
          
          {/* Localisation */}
          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-1">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{property.street || property.city || 'Gabon'}</span>
          </div>
          
          {/* Caractéristiques */}
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-600 dark:text-gray-300">
            {property.nbrRooms && (
              <div className="flex items-center gap-1">
                <Home className="h-3 w-3" />
                <span>{property.nbrRooms} ch.</span>
              </div>
            )}
            {property.area && (
              <div className="flex items-center gap-1">
                <Maximize className="h-3 w-3" />
                <span>{property.area} m²</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
