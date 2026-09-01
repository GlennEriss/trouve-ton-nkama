/**
 * @module constantes
 */

import type { IconType } from 'react-icons';
import { FaBriefcase, FaHome, FaHeart, FaBuilding, FaUsers, FaCouch, FaTree, FaMountain, FaSwimmingPool, FaDog, FaShoppingCart, FaBus, FaCar, FaWifi, FaShieldAlt, FaBicycle, FaRunning, FaChild, FaWheelchair, FaGraduationCap, FaUmbrellaBeach, FaPeace, FaColumns, FaWarehouse, FaRegClock, FaUserTie, FaStore } from 'react-icons/fa';
import { DEFAULT_TAG_NAMES } from '@/lib/tags/default-tags';

// Constants
export const MAX_IMAGES_UPLOAD = 10;
export const MAX_TAGS = 6;
export const MAX_REEL_DURATION_SECONDS = 600;
// Relevée avec la durée max (300 -> 600s) : sinon une vidéo deux fois plus longue au même
// bitrate se heurtait quand même à l'ancien plafond de taille, annulant l'intérêt de la
// nouvelle limite de durée pour les vidéos réellement longues.
export const MAX_REEL_RAW_SIZE_BYTES = 1000 * 1024 * 1024;

// Créa vidéo publicitaire (emplacement reels_infeed uniquement). Valeurs
// volontairement alignées sur les constantes Réels ci-dessus mais dupliquées
// (pas d'import croisé) pour garder les deux systèmes découplés.
export const AD_VIDEO_MAX_DURATION_SECONDS = 300;
export const AD_VIDEO_MAX_SIZE_BYTES = 500 * 1024 * 1024;

export const statusOptions = [
  {
    label: 'À vendre',
    value: 'FOR_SALE'
  },
  {
    label: 'À louer',
    value: 'FOR_RENT'
  }
];

const TAG_ICONS: Record<string, IconType> = {
  Travail: FaBriefcase,
  Famille: FaUsers,
  Couple: FaHeart,
  Villa: FaHome,
  'Sous barrière': FaShieldAlt,
  Meublé: FaCouch,
  'Centre-ville': FaBuilding,
  Vacances: FaUmbrellaBeach,
  Nature: FaTree,
  Montagne: FaMountain,
  Piscine: FaSwimmingPool,
  'Animaux admis': FaDog,
  'Commerces proches': FaShoppingCart,
  'Transport proche': FaBus,
  Parking: FaCar,
  'Wi-Fi': FaWifi,
  Sécurisé: FaShieldAlt,
  Vélo: FaBicycle,
  'Activités sportives': FaRunning,
  'Adapté aux enfants': FaChild,
  'Accessible handicapés': FaWheelchair,
  Étudiant: FaGraduationCap,
  'Calme et tranquillité': FaPeace,
  'Proche de la plage': FaUmbrellaBeach,
  Duplex: FaBuilding,
  Boutique: FaWarehouse,
  Balcon: FaColumns,
  Terrasse: FaColumns,
  Collocation: FaUsers,
  Garage: FaCar,
  'Court séjour': FaRegClock,
  Propriétaire: FaUserTie,
  Agence: FaStore,
};

export type TagName = string;
export type TagOption = {
  tagName: string;
  tagIcon: IconType;
};

export function resolveTagIcon(tagName: string) {
  return TAG_ICONS[tagName] ?? FaStore;
}

export function mapTagNamesToOptions(tagNames: string[]): TagOption[] {
  const unique = Array.from(new Set(tagNames.map((tag) => tag.trim()).filter(Boolean)));
  return unique.map((tagName) => ({
    tagName,
    tagIcon: resolveTagIcon(tagName),
  }));
}

export const allowedTagNames = [...DEFAULT_TAG_NAMES];
export const tags = mapTagNamesToOptions(allowedTagNames);

export const collectionFirebaseNames = {
  properties: 'properties',
  notifications: 'notifications'
}

export const supportContact = {
  email: 'contact@tonnkama.com',
  phone: '+221776960463'
}
