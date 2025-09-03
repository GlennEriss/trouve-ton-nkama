import { ICreation } from "./creation";

export type Street = ICreation & {
    name: string,
    cityId?: string | null,
    cityName?: string,
    provinceId?: string | null,
    provinceName?: string,
    country: string,
    countryCode?: string,
    latitude?: number,
    longitude?: number
}


