/**
 * @module compte
 */
import { countries } from "@/constantes/country";
import { ICreation } from "./creation";
import { Image } from "./annonce";

export type Country = {
    name: string,
    code: (typeof countries)[number]['code']
}

export type Person = ICreation & {
    firstname: string,
    lastname: string,
    birthDate?: string,
    email?: string|null,
    country?: Country,
    phoneNumbers: string[]
    image?: string|null
}