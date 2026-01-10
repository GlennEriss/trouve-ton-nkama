import { Metadata } from 'next';
import { InteractiveMapPage } from '@/components/interactive-map';

export const metadata: Metadata = {
  title: 'Carte Interactive du Gabon | Trouvez votre logement',
  description: 'Explorez la carte interactive du Gabon pour trouver des logements par quartier. Visualisez les délimitations des zones et découvrez les propriétés disponibles.',
  keywords: ['carte', 'Gabon', 'logement', 'quartier', 'immobilier', 'location', 'vente'],
  openGraph: {
    title: 'Carte Interactive du Gabon',
    description: 'Explorez les logements disponibles au Gabon par quartier',
    type: 'website',
  },
};

export default function MapPage() {
  return <InteractiveMapPage />;
}
