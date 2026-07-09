import { getMessaging, getToken, deleteToken, onMessage, type MessagePayload } from "firebase/messaging";
import { isSupported } from "firebase/messaging";
import { app } from "./app";
import { createLogger } from '@/lib/logger';

const logger = createLogger('firebase.messaging');

// Scope dédié pour ne pas entrer en conflit avec le service worker PWA (next-pwa,
// public/sw.js) enregistré sur le scope racine '/'.
const FCM_SW_URL = '/firebase-messaging-sw.js';
const FCM_SW_SCOPE = '/firebase-cloud-messaging-push-scope/';

export const messaging = async () => {
    const supported = await isSupported();
    return supported ? getMessaging(app) : null;
};

async function getDedicatedServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
    try {
        // Idempotent : si déjà enregistré sur ce scope, le navigateur retourne l'enregistrement existant.
        return await navigator.serviceWorker.register(FCM_SW_URL, { scope: FCM_SW_SCOPE });
    } catch (err) {
        logger.error('Failed to register the FCM service worker', { err });
        return null;
    }
}

export const fetchToken = async () => {
    try {
        const fcmMessaging = await messaging();
        const registration = await getDedicatedServiceWorkerRegistration();
        if (fcmMessaging && registration) {
            const token = await getToken(fcmMessaging, {
                vapidKey: process.env.NEXT_PUBLIC_FIREBASE_FCM_VAPID_KEY,
                serviceWorkerRegistration: registration,
            });
            return token;
        }
        return null;
    } catch (err) {
        logger.error('An error occurred while fetching the token', { err });
        return null;
    }
};

export const removeFetchedToken = async () => {
    try {
        const fcmMessaging = await messaging();
        if (fcmMessaging) {
            await deleteToken(fcmMessaging);
        }
    } catch (err) {
        logger.error('An error occurred while deleting the token', { err });
    }
};

// Un `onBackgroundMessage` (service worker) ne se déclenche que si l'onglet n'est pas actif.
// Cet écouteur couvre le cas où l'utilisateur a l'app ouverte au premier plan.
export const onForegroundMessage = async (callback: (payload: MessagePayload) => void) => {
    const fcmMessaging = await messaging();
    if (!fcmMessaging) return () => {};
    return onMessage(fcmMessaging, callback);
};
