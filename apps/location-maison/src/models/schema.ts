/**
 * @module schema
 */
import { z } from 'zod';

export const FormLoginSchema = z.object({
    email: z
        .string()
        .email({ message: "Veuillez entrer un email valide" })
        .nonempty({ message: "L'email est obligatoire" }),
    password: z
        .string()
        .min(1, { message: "Le mot de passe est obligatoire" }),
});

export type FormLoginSchemaType = z.infer<typeof FormLoginSchema>