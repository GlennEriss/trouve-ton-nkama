'use client';

import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';
import { getPrimaryPropertyImageUrl } from '@/lib/property-images';

interface PropertyDetailsPanelProps {
  selectedProperty: any;
  onClose: () => void;
}

export default function PropertyDetailsPanel({ selectedProperty, onClose }: PropertyDetailsPanelProps) {
  if (!selectedProperty) return null;
  const router = useRouter();
  const primaryImageUrl = getPrimaryPropertyImageUrl(selectedProperty.images);

  function translatePropertyType(type?: string): string {
    if (!type) return 'Non spécifié';

    const typeTranslations: Record<string, string> = {
      home: 'Maison',
      villa: 'Villa',
      logement: 'Logement',
      property: 'Propriété',
      apartment: 'Appartement',
      building: 'Immeuble',
      studio: 'Studio',
      room: 'Chambre',
      shop: 'Magasin',
      kiosk: 'Kiosque',
      desk: 'Bureau',
      land: 'Terrain'
    };

    const normalizedType = String(type).toLowerCase().trim();
    return typeTranslations[normalizedType] || normalizedType;
  }
  return (
    <div className="absolute bottom-6 right-6 w-80 bg-white rounded-xl shadow-xl border border-gray-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedProperty.title || selectedProperty.name}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {primaryImageUrl && (
          <div className="mb-4">
            <img
              src={primaryImageUrl}
              alt={selectedProperty.title || selectedProperty.name}
              className="w-full h-32 object-cover rounded-lg"
            />
          </div>
        )}

        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Type</span>
            <span className="text-sm font-medium capitalize">
              {translatePropertyType(selectedProperty.typeProperty)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Prix</span>
            <span className="text-lg font-bold text-[#146B67]">
              {selectedProperty.price
                ? `${selectedProperty.price.toLocaleString()} FCFA`
                : 'Prix sur demande'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Localisation</span>
            <span className="text-sm font-medium">
              {selectedProperty.city || selectedProperty.location || 'Non spécifié'}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => router.push(`/houseDetails/${selectedProperty.objectID}`)}
            className="flex-1 bg-[#146B67] hover:bg-[#1FA89B] text-white">
            Voir les détails
          </Button>
          {/* <Button
            variant="outline"
            className="flex-1 border-[#146B67] text-[#146B67] hover:bg-[#146B67] hover:text-white"
          >
            Contacter
          </Button> */}
        </div>
      </div>
    </div>
  );
}
