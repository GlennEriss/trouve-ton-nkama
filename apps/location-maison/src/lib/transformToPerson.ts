
import { User } from "@/models/authentication";
import { Country } from "@/models/compte";
import { FormRegisterSchemaType } from "@/models/schema";

export function transformToPerson(values: FormRegisterSchemaType): Partial<User> {
    const country: Country = {
        code: 'GA',
        name: 'Gabon',
    };

    // Convertir la structure de date en format string
    const birthDate = values.birthdate ? 
        `${values.birthdate.year}-${values.birthdate.month}-${values.birthdate.day}` : 
        '';

    const roles: User['roles'] = values.accountType === 'Announcer'
        ? ['User', 'Announcer']
        : ['User'];

    return {
        firstname: values.firstname,
        lastname: values.lastname,
        birthDate: birthDate,
        email: values.email,
        country: country,
        phoneNumbers: [values.phone],
        login: values.email,
        password: values.password,
        roles
    };
}
