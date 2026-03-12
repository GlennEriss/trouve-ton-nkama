/**
 * @module constantes
 */

import type { IconType } from 'react-icons';
import { FaBriefcase, FaHome, FaHeart, FaBuilding, FaUsers, FaCouch, FaTree, FaMountain, FaSwimmingPool, FaDog, FaShoppingCart, FaBus, FaCar, FaWifi, FaShieldAlt, FaBicycle, FaRunning, FaChild, FaWheelchair, FaGraduationCap, FaUmbrellaBeach, FaPeace, FaColumns, FaWarehouse, FaRegClock, FaUserTie, FaStore } from 'react-icons/fa';
import tagNames from './tags.json';

// Constants
export const MAX_IMAGES_UPLOAD = 10;
export const MAX_TAGS = 6;

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

export const tags = (tagNames as string[]).map((tagName) => ({
  tagName,
  tagIcon: TAG_ICONS[tagName] ?? FaStore,
}));

export const collectionFirebaseNames = {
  properties: 'properties',
  notifications: 'notifications'
}

export const supportContact = {
  email: 'contact@tonnkama.com',
  phone: '+221776960463'
}
