import { ICreation } from "./creation";

export type City = ICreation & {
    name: string,
    provinceId?: string | null,
    provinceName?: string,
    country: string,
    countryCode?: string,
    latitude?: number,
    longitude?: number
}


