/**
 * @module annonce
 */

import { ICreation } from "./creation";

//Property
export type TypeProperty = keyof typeof TypePropertyEnum;
export type StatusProperty = "FOR_RENT" | "FOR_SALE"
export type Image = {
    filePATH: string,
    fileURL: string
}
export type Property = Location & ICreation & {
    typeProperty: TypeProperty
    images: Image[]
    title: string,
    description: string,
    area: number,
    price: number,
    tags: string[],
    createdBy?: string,
    status: StatusProperty
}

export type Location = {
    street: string,
    city: string,
    province: string,
    additionnalInformation?: string
    longitude: number,
    latitude: number,
    country: string,
    countryCode: string
}
export type Logement = Property & {
    nbrRooms: number,
    nbrChickens: number,
    nbrBathrooms: number,
    nbrToilets: number
}

export type Apartment = Logement & {
    nbrFloorApartment: number,
    numeroApartment: string
}

export type Building = Property & {
    nbrApartments: number,
    nbrFloors: number,
    hasParking: number
}

export type Desk = Property & {
    nbrToilets: number,
    nbrRooms: number
}

export type Home = Logement & {
    nbrFloors: number,
    nbrGarages: number
}

export type Studio = Logement & {
    nbrFloorStudio: number,
    numeroStudio: string
}

export type Villa = Home & {
    nbrPiscine: number
}
