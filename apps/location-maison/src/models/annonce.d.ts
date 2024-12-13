/**
 * @module annonce
 */

import { ICreation } from "./creation";

export type Image = {
    path: string,
    url: string
}

export type Address = {
    region: string,
    city: string,
    street: string,
    logitude: string,
    latitude: string
}

export const TypeAnnonce = 'HOME'| 'APARTMENT' | 'STUDIO'| 'LAND'
export type Annonce = ICreation & {
    images: Image[],
    address: Address,
    title: string,
    description: string,
    type: TypeAnnonce,
    price: number,
    area: number
}

