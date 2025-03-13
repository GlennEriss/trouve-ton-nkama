/**
 * @module authentication
 */
import { Person } from "@/models/compte";
import { metadata } from '../app/layout';
type ProviderType = 'GOOGLE'|'FACEBOOK'
export type User = Person & {
    uid: string;
    login: string,
    password?: string
    roles: Role[],
    emailVerified?: boolean,
    providers: ProviderType[],
    metadata: any,
    favoris: string[]
}

export type Role = 'Admin' | 'Announcer'