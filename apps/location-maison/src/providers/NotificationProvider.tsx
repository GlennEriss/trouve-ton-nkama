'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { Notification } from "@/models/notification";
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp, orderBy, limit, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { useCurrentUser } from "@/hooks/use-current-user";
import { db } from "@/firebase/firestore";
import { createLogger } from '@/lib/logger';

const logger = createLogger('providers.notification');

type NotificationContextType = {
    notifications: Notification[];
    unreadCount: number;
    markAllAsRead: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const { user, isFirebaseConnected } = useCurrentUser();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Fonction pour mapper les documents Firestore vers des notifications
    const mapDocumentsToNotifications = (snapshot: QuerySnapshot<DocumentData, DocumentData>): Notification[] => {
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Notification),
        }));
    };

    // Fonction pour fusionner les notifications en évitant les doublons
    const mergeNotifications = (unreadNotifications: Notification[], recentNotifications: Notification[]): Notification[] => {
        const filteredRecent = recentNotifications.filter((notif: Notification) => 
            !unreadNotifications.some((un: Notification) => un.id === notif.id)
        );
        return [...unreadNotifications, ...filteredRecent];
    };

    // Récupération des notifications en temps réel
    useEffect(() => {
        const uid = user?.uid?.trim();
        // `user.uid` (session NextAuth) est disponible avant que le pont Firebase (custom
        // token, voir connectFirebaseClient dans use-current-user.ts) soit réellement établi.
        // S'abonner trop tôt fait échouer la requête en permission-denied — et onSnapshot ne
        // réessaie jamais tout seul après une erreur de permission, donc la cloche restait
        // vide jusqu'au prochain rechargement complet de la page. Attendre isFirebaseConnected
        // avant de s'abonner évite ce raté au premier chargement.
        if (!uid || !isFirebaseConnected) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }
    
        // Calcul de la date limite (7 jours en arrière)
        const sevenDaysAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    
        // Requête 1 : Récupérer uniquement les notifications non lues
        const unreadQuery = query(
            collection(db, "notifications"),
            where("createdFor", "==", uid),
            where("isRead", "==", false),
            orderBy("createdAt", "desc"),
            limit(50)
        );
    
        // Requête 2 : Récupérer les notifications des 7 derniers jours
        const recentQuery = query(
            collection(db, "notifications"),
            where("createdFor", "==", uid),
            where("createdAt", ">=", sevenDaysAgo),
            orderBy("createdAt", "desc"),
            limit(50)
        );
    
        // Exécuter les requêtes avec gestion d'erreur
        let unreadNotifications: Notification[] = [];
        let recentNotifications: Notification[] = [];
        const syncNotifications = () => {
            setNotifications(mergeNotifications(unreadNotifications, recentNotifications));
        };
        let unsubscribeUnread: (() => void) | undefined;
        let unsubscribeRecent: (() => void) | undefined;
        
        try {
            unsubscribeUnread = onSnapshot(
                unreadQuery, 
                (snapshot) => {
                    unreadNotifications = mapDocumentsToNotifications(snapshot);
                    syncNotifications();
                },
                (error) => {
                    logger.warn("Erreur lors de l'écoute des notifications non lues", { error });
                    // En cas d'erreur de permission, on arrête d'écouter
                    if (error.code === 'permission-denied') {
                        logger.warn("Permissions insuffisantes pour les notifications");
                    }
                }
            );

            unsubscribeRecent = onSnapshot(
                recentQuery,
                (snapshot) => {
                    recentNotifications = mapDocumentsToNotifications(snapshot);
                    syncNotifications();
                },
                (error) => {
                    logger.warn("Erreur lors de l'écoute des notifications récentes", { error });
                    if (error.code === 'permission-denied') {
                        logger.warn("Permissions insuffisantes pour les notifications récentes");
                    }
                }
            );
        } catch (error) {
            logger.warn("Erreur lors de l'initialisation des listeners de notifications", { error });
        }
    
        return () => {
            if (unsubscribeUnread) {
                unsubscribeUnread();
            }
            if (unsubscribeRecent) {
                unsubscribeRecent();
            }
        };
    }, [user?.uid, isFirebaseConnected]);

    // Mise à jour du nombre de notifications non lues
    useEffect(() => {
        setUnreadCount(notifications.filter((n) => !n.isRead).length);
    }, [notifications]);

    // Fonction pour marquer une notification comme lue
    const markAsRead = async (id: string) => {
        try {
            const notificationRef = doc(db, "notifications", id);
            await updateDoc(notificationRef, { isRead: true });

            setNotifications((prev) =>
                prev.map((notif) =>
                    notif.id === id ? { ...notif, isRead: true } : notif
                )
            );
        } catch (error: any) {
            logger.error("Erreur lors de la mise à jour de la notification", { error, id });
            // Si c'est une erreur de permission, on peut quand même mettre à jour l'état local
            if (error.code === 'permission-denied') {
                logger.warn("Permissions insuffisantes pour marquer la notification comme lue");
                // Mettre à jour l'état local même en cas d'erreur de permission
                setNotifications((prev) =>
                    prev.map((notif) =>
                        notif.id === id ? { ...notif, isRead: true } : notif
                    )
                );
            }
        }
    };

    // Fonction pour marquer toutes les notifications comme lues
    const markAllAsRead = async () => {
        const unreadNotifications = notifications.filter((notif) => !notif.isRead);

        try {
            const updatePromises = unreadNotifications.map((notif) => {
                const notificationRef = doc(db, "notifications", notif.id ?? '');
                return updateDoc(notificationRef, { isRead: true });
            });

            await Promise.all(updatePromises);

            setNotifications((prev) =>
                prev.map((notif) => ({ ...notif, isRead: true }))
            );
        } catch (error: any) {
            logger.error("Erreur lors de la mise à jour des notifications", { error });
            // Si c'est une erreur de permission, on peut quand même mettre à jour l'état local
            if (error.code === 'permission-denied') {
                logger.warn("Permissions insuffisantes pour marquer toutes les notifications comme lues");
                // Mettre à jour l'état local même en cas d'erreur de permission
                setNotifications((prev) =>
                    prev.map((notif) => ({ ...notif, isRead: true }))
                );
            }
        }
    };

    const contextValue = useMemo(() => ({
        notifications,
        unreadCount,
        markAllAsRead,
        markAsRead
    }), [notifications, unreadCount, markAllAsRead, markAsRead]);

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
        </NotificationContext.Provider>
    );
}

// Hook personnalisé pour consommer le contexte
export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotifications must be used within a NotificationProvider");
    }
    return context;
}
