/**
 * @module compte
 */
import { countries } from "@/constantes/country";
import { ICreation } from "./creation";

export type Country = {
    name: string,
    code: (typeof countries)[number]['code']
}

export type Person = ICreation & {
    firstname: string,
    lastname: string,
    birthDate: string,
    email: string,
    country: Country,
    phoneNumbers: string[]
}