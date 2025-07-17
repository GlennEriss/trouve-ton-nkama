
import { User } from "@/models/authentication";
import { Country } from "@/models/compte";
import { FormRegisterSchemaType } from "@/models/schema";

export function transformToPerson(values: FormRegisterSchemaType): Partial<User> {
    const country: Country = {
        code: 'GA',
        name: 'Gabon',
    };

    return {
        firstname: values.firstname,
        lastname: values.lastname,
        birthDate: values.birthdate,
        email: values.email,
        country: country,
        phoneNumbers: [values.phone],
        phoneNumberVerified: false,
        login: values.email,
        password: values.password,
        roles: ['Announcer']
    };
}