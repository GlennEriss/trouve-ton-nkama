import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { app } from "./app";

export const messaging = async () => {
    const supported = await isSupported();
    return supported ? getMessaging(app) : null;
};

export const fetchToken = async () => {
    try {
        const fcmMessaging = await messaging();
        if (fcmMessaging) {
            const token = await getToken(fcmMessaging, {
                vapidKey: process.env.NEXT_PUBLIC_FIREBASE_FCM_VAPID_KEY,
            });
            return token;
        }
        return null;
    } catch (err) {
        console.error("An error occurred while fetching the token:", err);
        return null;
    }
};
