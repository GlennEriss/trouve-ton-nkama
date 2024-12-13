/**
 * @module authentication
 */
export type User = Person & {
    login: string,
    password: string
    roles: Role[]
}

export type Role = 'Admin'|'Announcer'