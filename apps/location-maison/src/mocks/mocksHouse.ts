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
}

// Images pour chaque type de propriété
const images = {
    house: "https://www.gabonhome.com/_admin/images/photo/photo/gabonhome-2021-23-0709563524424.jpeg",
    apartment: "https://media.bazarafrique.com/upload/post/62320b769e379479930349.png",
    studio: "https://www.gabonhome.com/_admin/images/photo/photo/gabonhome-2023-18-0711081635936.jpeg",
    room: "https://gabonhome.com/_admin/images/photo/photo/gabonhome-2023-01-0908354536658.jpg",
};

// Quartiers par ville
const streetsByCity = {
    Libreville: ["Angondjé", "Nzeng-Ayong", "Ambowé", "Batterie IV"],
    "Port-Gentil": ["Quartier Général", "Quartier Sud", "Ntchengué"],
    Akanda: ["Avorbam", "Cap Estérias", "Akanda Centre"],
};

export const houseMocks: House[] = [
    // Exemples statiques avec les quartiers
    {
        id: "1",
        title: "House 1",
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
        images: [
            {
                fileURL: images.house,
            },
        ],
    },
    {
        id: "2",
        title: "Apartment 2",
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
        images: [
            {
                fileURL: images.apartment,
            },
        ],
    },
    {
        id: "3",
        title: "Studio 3",
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
        images: [
            {
                fileURL: images.studio,
            },
        ],
    },
    {
        id: "4",
        title: "Room 4",
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
        images: [
            {
                fileURL: images.room,
            },
        ],
    },
    {
        id: "5",
        title: "House 5",
        city: "Libreville",
        province: "Estuaire",
        country: "Gabon",
        status: "FOR_SALE",
        price: 3000000,
        nbrRooms: 5,
        nbrToilets: 3,
        area: 280,
        typeProperty: "House",
        street: "Nzeng-Ayong",
        images: [
            {
                fileURL: images.house,
            },
        ],
    },
];

// Génération dynamique des 95 autres propriétés
for (let i = 6; i <= 100; i++) {
    const propertyType = ["House", "Apartment", "Studio", "Room"][
        Math.floor(Math.random() * 4)
        ];
    const status = Math.random() > 0.5 ? "FOR_SALE" : "FOR_RENT";
    const city = ["Libreville", "Port-Gentil", "Akanda"][
        Math.floor(Math.random() * 3)
        ];
    const price =
        propertyType === "House"
            ? Math.floor(Math.random() * 4000000) + 1000000
            : propertyType === "Apartment"
                ? Math.floor(Math.random() * 350000) + 150000
                : propertyType === "Studio"
                    ? Math.floor(Math.random() * 100000) + 100000
                    : Math.floor(Math.random() * 40000) + 50000;
    const nbrRooms =
        propertyType === "Room" || propertyType === "Studio"
            ? 1
            : Math.floor(Math.random() * 3) + 3;
    const nbrToilets =
        propertyType === "Room" || propertyType === "Studio"
            ? 1
            : Math.floor(Math.random() * 2) + 2;
    const area =
        propertyType === "House"
            ? Math.floor(Math.random() * 250) + 250
            : propertyType === "Apartment"
                ? Math.floor(Math.random() * 100) + 100
                : propertyType === "Studio"
                    ? Math.floor(Math.random() * 20) + 30
                    : Math.floor(Math.random() * 10) + 15;
    const imageURL = images[propertyType.toLowerCase() as keyof typeof images];

    // Choisir un quartier aléatoire pour la ville
    const street =
        streetsByCity[city as keyof typeof streetsByCity][
            Math.floor(Math.random() * streetsByCity[city as keyof typeof streetsByCity].length)
            ];

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
        street,
        images: [{ fileURL: imageURL }],
    });
}

export default houseMocks;