/**
 * @module creation
 */
export type StateCreation = 'ARCHIVED'|'IN_PROGRESS'
export type ICreation = {
    id?: string,
    createdAt: Date,
    updatedAt: Date,
    searchableName?: string,
    state: StateCreation
}