/**
 * @module authentication
 */
import { Person } from "@/models/compte";
export type User = Person & {
    uid: string;
    login: string,
    password?: string
    roles: Role[]
}

export type Role = 'Admin' | 'Announcer'