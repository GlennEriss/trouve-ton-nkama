import { Timestamp } from "firebase/firestore"

/**
 * @module creation
 */
export type StateCreation = 'ARCHIVED'|'IN_PROGRESS'
export type ICreation = {
    id?: string,
    createdAt?: Timestamp | {seconds: number, nanoseconds: number},
    updatedAt?: Timestamp | {seconds: number, nanoseconds: number},
    searchableName?: string,
    state: StateCreation
} 