/**
 * @module authentication
 */
import { Person } from "@/models/compte";
import { metadata } from '../app/layout';
type ProviderType = 'GOOGLE'|'FACEBOOK'|'CREDENTIALS'|'PHONE'
export type User = Person & {
    uid: string;
    login: string,
    password?: string
    roles: Role[],
    emailVerified?: boolean,
    providers: ProviderType[],
    metadata: any,
    favoris: string[],
    credits: number
    // Cadeaux reçus sur les réels : cumul NET (après commission plateforme),
    // incrémenté uniquement par le webhook giftPaymentCallback. Le solde
    // retirable est dérivé (net cumulé − retraits non refusés), jamais stocké.
    giftTotalReceivedXaf?: number
    giftCountReceived?: number
}

export type Role = 'Admin' | 'User' | 'Announcer'
