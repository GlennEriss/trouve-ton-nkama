import { countries } from "@/constantes/country";
import { User } from "@/models/authentication";
import { Country } from "@/models/compte";
import { FormRegisterSchemaType } from "@/models/schema";

export function transformToPerson(values: FormRegisterSchemaType): Partial<User> {
    const country: Country = countries.find((c) => c.code === values.country) || {
        code: values.country as (typeof countries)[number]['code'],
        name: "Unknown Country",
    };

    return {
        firstname: values.firstname,
        lastname: values.lastname,
        birthDate: values.birthdate,
        email: values.email,
        country: country,
        phoneNumbers: [values.phone],
        login: values.email,
        password: values.password,
        roles: ['Announcer']
    };
}