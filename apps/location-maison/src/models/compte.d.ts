/**
 * @module compte
 */
import { countries } from "@/constantes/country";
import { ICreation } from "./creation";
import { Image } from "./annonce";
import { NotificationParameter } from "@/models/notifications";

export type Country = {
    name: string,
    code: (typeof countries)[number]['code']
}

export type Person = ICreation & {
    firstname: string,
    lastname: string,
    // Nom d'affichage choisi par l'utilisateur (typiquement le nom de sa boutique). Quand il est
    // renseigné, il remplace "firstname lastname" partout où un nom est affiché — voir
    // getUserDisplayName() dans @/lib/user-display-name. Optionnel : la majorité des comptes
    // existants n'en ont pas et retombent sur le nom réel.
    pseudo?: string,
    birthDate?: string,
    email?: string | null,
    country?: Country,
    // Source de vérité pour l'authentification par OTP, l'auto-attribution des annonces
    // (findByPhoneNumber, array-contains) et la vérification. callNumber/whatsappNumber ci-dessous
    // ne s'y substituent pas : ils qualifient l'usage de chaque numéro pour les contacts d'annonce.
    phoneNumbers: string[]
    phoneNumberVerified?: boolean
    // Numéro sur lequel l'annonceur veut être appelé.
    callNumber?: string
    // Numéro WhatsApp, souvent différent du numéro d'appel. Sert à pré-remplir `whatsappContact`
    // à la création d'une annonce.
    whatsappNumber?: string
    image?: string | null,
    notificationParameter?: NotificationParameter,
    darkMode?: boolean
    fcmTokens?: string[]
}