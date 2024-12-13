/**
 * @module compte
 */
import { countries } from "@/constantes/country";
import { ICreation } from "./creation";

export type Phone = {
    countryCode: (typeof countries)[number]['code'],
    numero: number
}

export type Country = {
    name: string,
    code: string
}

export type Person = ICreation & {
    firstname: string,
    lastname: string,
    birthDate: Date,
    email: string,
    country: Country,
    phoneNumbers: Phone[]
}