export interface House {
  id: string;
  title: string;
  city: string;
  province: string;
  country: string;
  status: "FOR_SALE" | "FOR_RENT";
  price: number;
  nbrRooms: number;
  nbrToilets: number;
  area: number;
  typeProperty: "House" | "Apartment" | "Studio" | "Room";
  street: string; // Quartier ajouté
  images: { fileURL: string }[];
  location: { latitude: number; longitude: number }; // Localisation ajoutée
}

// Images pour chaque type de propriété
const images = {
  house:
    "https://www.gabonhome.com/_admin/images/photo/photo/gabonhome-2021-23-0709563524424.jpeg",
  apartment:
    "https://media.bazarafrique.com/upload/post/62320b769e379479930349.png",
  studio:
    "https://www.gabonhome.com/_admin/images/photo/photo/gabonhome-2023-18-0711081635936.jpeg",
  room: "https://gabonhome.com/_admin/images/photo/photo/gabonhome-2023-01-0908354536658.jpg",
};

// Quartiers et leurs coordonnées
const streetsByCity = {
  Libreville: {
    Angondjé: { latitude: 0.445229, longitude: 9.415245 },
    "Nzeng-Ayong": { latitude: 0.408261, longitude: 9.500208 },
    Ambowé: { latitude: 0.392181, longitude: 9.457291 },
    "Batterie IV": { latitude: 0.384817, longitude: 9.439558 },
  },
  "Port-Gentil": {
    "Quartier Général": { latitude: -0.719556, longitude: 8.781161 },
    "Quartier Sud": { latitude: -0.723567, longitude: 8.777759 },
    Ntchengué: { latitude: -0.706042, longitude: 8.767953 },
  },
  Akanda: {
    Avorbam: { latitude: 0.512815, longitude: 9.406988 },
    "Cap Estérias": { latitude: 0.627773, longitude: 9.33553 },
    "Akanda Centre": { latitude: 0.507716, longitude: 9.428998 },
  },
};

// Fonctions utilitaires pour générer les propriétés aléatoirement
// Note: Math.random() est sécurisé ici car utilisé uniquement pour les données de test/mock
function generateRandomPrice(propertyType: string): number {
  if (propertyType === "House") {
    return Math.floor(Math.random() * 4000000) + 1000000; // Safe: mock data only
  }
  if (propertyType === "Apartment") {
    return Math.floor(Math.random() * 350000) + 150000; // Safe: mock data only
  }
  if (propertyType === "Studio") {
    return Math.floor(Math.random() * 100000) + 100000; // Safe: mock data only
  }
  return Math.floor(Math.random() * 40000) + 50000; // Safe: mock data only
}

function generateRandomRooms(propertyType: string): number {
  if (propertyType === "Room" || propertyType === "Studio") {
    return 1;
  }
  return Math.floor(Math.random() * 3) + 3; // Safe: mock data only
}

function generateRandomToilets(propertyType: string): number {
  if (propertyType === "Room" || propertyType === "Studio") {
    return 1;
  }
  return Math.floor(Math.random() * 2) + 2; // Safe: mock data only
}

function generateRandomArea(propertyType: string): number {
  if (propertyType === "House") {
    return Math.floor(Math.random() * 250) + 250; // Safe: mock data only
  }
  if (propertyType === "Apartment") {
    return Math.floor(Math.random() * 100) + 100; // Safe: mock data only
  }
  if (propertyType === "Studio") {
    return Math.floor(Math.random() * 20) + 30; // Safe: mock data only
  }
  return Math.floor(Math.random() * 10) + 15; // Safe: mock data only
}

// Génération des propriétés avec coordonnées
export const houseMocks: House[] = [
  {
    id: "1",
    title: "Villa 3 chambres à louer à Akanda",
    city: "Libreville",
    province: "Estuaire",
    country: "Gabon",
    status: "FOR_SALE",
    price: 4500000,
    nbrRooms: 6,
    nbrToilets: 4,
    area: 300,
    typeProperty: "House",
    street: "Angondjé",
    images: [{ fileURL: images.house }],
    location: streetsByCity.Libreville.Angondjé,
  },
  {
    id: "2",
    title: "Appartement 2 chambres à Ambowé",
    city: "Libreville",
    province: "Estuaire",
    country: "Gabon",
    status: "FOR_RENT",
    price: 300000,
    nbrRooms: 4,
    nbrToilets: 2,
    area: 120,
    typeProperty: "Apartment",
    street: "Ambowé",
    images: [{ fileURL: images.apartment }],
    location: streetsByCity.Libreville.Ambowé,
  },
  {
    id: "3",
    title: "Studio moderne au Quartier Sud",
    city: "Port-Gentil",
    province: "Ogooué maritime",
    country: "Gabon",
    status: "FOR_RENT",
    price: 180000,
    nbrRooms: 1,
    nbrToilets: 1,
    area: 45,
    typeProperty: "Studio",
    street: "Quartier Sud",
    images: [{ fileURL: images.studio }],
    location: streetsByCity["Port-Gentil"]["Quartier Sud"],
  },
  {
    id: "4",
    title: "Chambre spacieuse à Cap Estérias",
    city: "Akanda",
    province: "Estuaire",
    country: "Gabon",
    status: "FOR_RENT",
    price: 70000,
    nbrRooms: 1,
    nbrToilets: 1,
    area: 20,
    typeProperty: "Room",
    street: "Cap Estérias",
    images: [{ fileURL: images.room }],
    location: streetsByCity.Akanda["Cap Estérias"],
  },
];

// Génération dynamique des autres propriétés avec localisation
// Note: Math.random() est sécurisé ici car utilisé uniquement pour les données de test/mock
for (let i = 5; i <= 100; i++) {
  const propertyType = ["House", "Apartment", "Studio", "Room"][
    Math.floor(Math.random() * 4) // Safe: mock data only
  ];
  const status = Math.random() > 0.5 ? "FOR_SALE" : "FOR_RENT"; // Safe: mock data only
  const city = ["Libreville", "Port-Gentil", "Akanda"][
    Math.floor(Math.random() * 3) // Safe: mock data only
  ];
  
  const price = generateRandomPrice(propertyType);
  const nbrRooms = generateRandomRooms(propertyType);
  const nbrToilets = generateRandomToilets(propertyType);
  const area = generateRandomArea(propertyType);
  
  const imageURL = images[propertyType.toLowerCase() as keyof typeof images];

  const streets: any = streetsByCity[city as keyof typeof streetsByCity];
  const streetKeys = Object.keys(streets);
  const randomStreet =
    streetKeys[Math.floor(Math.random() * streetKeys.length)]; // Safe: mock data only
  const location = streets[randomStreet];

  houseMocks.push({
    id: i.toString(),
    title: `${propertyType} ${i}`,
    city,
    province: "Estuaire",
    country: "Gabon",
    status,
    price,
    nbrRooms,
    nbrToilets,
    area,
    typeProperty: propertyType as "House" | "Apartment" | "Studio" | "Room",
    street: randomStreet,
    images: [{ fileURL: imageURL }],
    location,
  });
}

export default houseMocks;
