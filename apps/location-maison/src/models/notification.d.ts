import { ICreation } from "./creation";

/**
 * @module notifications
 */
export type NotificationParameter = {
    isNew: boolean;
    isAccountActivity: boolean,
    isNewAnnouncement: boolean,
    isFavoris: boolean,
    isPersonalizedSuggestions: boolean,
    isSystemUpdated: boolean
}

type Notification = ICreation & {
    uid: string;
    userName: string;
    action: string;
    target: string;
    timestamp: string;
    unread: boolean;
};