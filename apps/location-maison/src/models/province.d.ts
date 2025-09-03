import { ICreation } from "./creation";

export type Province = ICreation & {
    name: string,
    country: string,
    countryCode?: string,
    latitude?: number,
    longitude?: number
}


