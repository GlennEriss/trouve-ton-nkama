export const HOME_PROPERTY_TYPE_KEYS = [
  'Home',
  'Studio',
  'Apartment',
  'Building',
  'Desk',
  'Room',
  'Kiosk',
  'Shop',
  'Land',
] as const;

export type HomePropertyTypeKey = (typeof HOME_PROPERTY_TYPE_KEYS)[number];

export const HOME_PROVINCE_NAMES = [
  'Estuaire',
  'Haut-Ogooué',
  'Moyen-Ogooué',
  'Ngounié',
  'Nyanga',
  'Ogooué-Ivindo',
  'Ogooué-Lolo',
  'Ogooué-Maritime',
  'Woleu-Ntem',
] as const;

export type HomeProvinceName = (typeof HOME_PROVINCE_NAMES)[number];

export const HOME_PROVINCES: ReadonlyArray<{
  name: HomeProvinceName;
  img: string;
  logo: string;
}> = [
  {
    name: 'Estuaire',
    img: 'estuaire.webp',
    logo: 'g1.webp',
  },
  {
    name: 'Haut-Ogooué',
    img: 'haut-ogooue.webp',
    logo: 'g2.webp',
  },
  {
    name: 'Moyen-Ogooué',
    img: 'moyen-ogooue.webp',
    logo: 'g3.webp',
  },
  {
    name: 'Ngounié',
    img: 'ngounié.webp',
    logo: 'g4.webp',
  },
  {
    name: 'Nyanga',
    img: 'nyanga.webp',
    logo: 'g5.webp',
  },
  {
    name: 'Ogooué-Ivindo',
    img: 'ogooue-ivindo.webp',
    logo: 'g6.webp',
  },
  {
    name: 'Ogooué-Lolo',
    img: 'ogooue-lolo.webp',
    logo: 'g7.webp',
  },
  {
    name: 'Ogooué-Maritime',
    img: 'ogooue-maritime.webp',
    logo: 'g8.webp',
  },
  {
    name: 'Woleu-Ntem',
    img: 'woleu-ntem.webp',
    logo: 'g9.webp',
  },
];
