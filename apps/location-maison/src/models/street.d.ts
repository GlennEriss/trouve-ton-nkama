import { ICreation } from "./creation";

export type Street = ICreation & {
    name: string,
    cityId?: string,
    cityName?: string,
    provinceId?: string,
    provinceName?: string,
    country: string,
    countryCode?: string,
    latitude?: number,
    longitude?: number
}


