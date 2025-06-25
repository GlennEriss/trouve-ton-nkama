'use client';

import React, { createContext, useContext, useEffect, useState } from "react";
import { Notification } from "@/models/notification";
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp, orderBy, limit, Query, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { useCurrentUser } from "@/hooks/use-current-user";
import { db } from "@/firebase/firestore";

type NotificationContextType = {
    notifications: Notification[];
    unreadCount: number;
    markAllAsRead: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useCurrentUser();
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

    // Callback pour traiter les notifications récentes
    const handleRecentSnapshot = (unreadNotifications: Notification[]) => {
        return (snapshot: QuerySnapshot<DocumentData, DocumentData>) => {
            const recentNotifications = mapDocumentsToNotifications(snapshot);
            const allNotifications = mergeNotifications(unreadNotifications, recentNotifications);
            setNotifications(allNotifications);
        };
    };

    // Callback pour traiter les notifications non lues
    const handleUnreadSnapshot = (recentQuery: Query<DocumentData, DocumentData>) => {
        return (snapshot: QuerySnapshot<DocumentData, DocumentData>) => {
            const unreadNotifications = mapDocumentsToNotifications(snapshot);
            return onSnapshot(recentQuery, handleRecentSnapshot(unreadNotifications));
        };
    };

    // Récupération des notifications en temps réel
    useEffect(() => {
        if (!user) return;
    
        // Calcul de la date limite (7 jours en arrière)
        const sevenDaysAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    
        // Requête 1 : Récupérer uniquement les notifications non lues
        const unreadQuery = query(
            collection(db, "notifications"),
            where("createdFor", "==", user.uid),
            where("isRead", "==", false),
            orderBy("createdAt", "desc"),
            limit(50)
        );
    
        // Requête 2 : Récupérer les notifications des 7 derniers jours
        const recentQuery = query(
            collection(db, "notifications"),
            where("createdFor", "==", user.uid),
            where("createdAt", ">=", sevenDaysAgo),
            orderBy("createdAt", "desc"),
            limit(50)
        );
    
        // Exécuter les requêtes
        const unsubscribeUnread = onSnapshot(unreadQuery, handleUnreadSnapshot(recentQuery));
    
        return () => unsubscribeUnread();
    }, [user]);

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
        } catch (error) {
            console.error("Erreur lors de la mise à jour de la notification :", error);
        }
    };

    // Fonction pour marquer toutes les notifications comme lues
    const markAllAsRead = async () => {
        const unreadNotifications = notifications.filter((notif) => !notif.isRead);

        try {
            const updatePromises = unreadNotifications.map((notif) => {
                const notificationRef = doc(db, "notifications", notif.id!);
                return updateDoc(notificationRef, { isRead: true });
            });

            await Promise.all(updatePromises);

            setNotifications((prev) =>
                prev.map((notif) => ({ ...notif, isRead: true }))
            );
        } catch (error) {
            console.error("Erreur lors de la mise à jour des notifications :", error);
        }
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAllAsRead, markAsRead }}>
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