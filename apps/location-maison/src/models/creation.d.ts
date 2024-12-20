import { Timestamp } from "firebase/firestore"

/**
 * @module creation
 */
export type StateCreation = 'ARCHIVED'|'IN_PROGRESS'
export type ICreation = {
    id?: string,
    createdAt?: Timestamp,
    updatedAt?: Timestamp,
    searchableName?: string,
    state: StateCreation
}