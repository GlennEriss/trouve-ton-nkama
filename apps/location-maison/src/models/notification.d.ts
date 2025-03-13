import { ICreation } from "./creation";

/**
 * @module notifications
 */

export type TypeNotification = 'BOOKMARKING'
export type NotificationParameter = {
    isNew: boolean;
    isAccountActivity: boolean,
    isNewAnnouncement: boolean,
    isFavoris: boolean,
    isPersonalizedSuggestions: boolean,
    isSystemUpdated: boolean
}

export type Notification = ICreation & {
    idProperty?: string;
    type: TypeNotification;
    title: string;
    message: string;
    isRead: boolean;
    createdFor: string;
};