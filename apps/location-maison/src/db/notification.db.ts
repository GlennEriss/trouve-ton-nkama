import { Notification } from "@/models/notification";
import { createModel } from "./generic.db";
import { collectionFirebaseNames } from "@/constantes";

export async function createNotification(notification: Partial<Notification>): Promise<string | null> {
    return await createModel<Partial<Notification>>(notification, collectionFirebaseNames.notifications)
}