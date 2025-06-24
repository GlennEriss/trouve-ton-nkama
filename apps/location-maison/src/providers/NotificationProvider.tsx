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

    // Fonction pour traiter les notifications non lues
    const handleUnreadNotifications = (unreadNotifications: Notification[], recentQuery: Query<DocumentData, DocumentData>) => {
        const unsubscribeRecent = onSnapshot(recentQuery, (snapshot: QuerySnapshot<DocumentData, DocumentData>) => {
            const recentNotifications = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as Notification),
            }));

            // 🔥 Fusionner les résultats : non lues en premier, puis récentes sans doublons
            const allNotifications = [
                ...unreadNotifications, // 🔹 Priorité aux non lues
                ...recentNotifications.filter((notif: Notification) => 
                    !unreadNotifications.some((un: Notification) => un.id === notif.id)
                ) // 🔹 Ajout des récentes sans doublons
            ];

            setNotifications(allNotifications);
        });

        return unsubscribeRecent;
    };

    // Fonction pour traiter la requête des notifications non lues
    const handleUnreadQuery = (unreadQuery: Query<DocumentData, DocumentData>, recentQuery: Query<DocumentData, DocumentData>) => {
        return onSnapshot(unreadQuery, (snapshot: QuerySnapshot<DocumentData, DocumentData>) => {
            const unreadNotifications = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as Notification),
            }));

            const unsubscribeRecent = handleUnreadNotifications(unreadNotifications, recentQuery);
            return unsubscribeRecent;
        });
    };

    // Récupération des notifications en temps réel
    useEffect(() => {
        if (!user) return;
    
        // 🔹 Calcul de la date limite (7 jours en arrière)
        const sevenDaysAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    
        // 🔹 Requête 1 : Récupérer uniquement les notifications non lues
        const unreadQuery = query(
            collection(db, "notifications"),
            where("createdFor", "==", user.uid),
            where("isRead", "==", false), // 🔥 Récupérer seulement les non lues
            orderBy("createdAt", "desc"),
            limit(50) // 🔹 On limite pour éviter de surcharger Firestore
        );
    
        // 🔹 Requête 2 : Récupérer les notifications des 7 derniers jours
        const recentQuery = query(
            collection(db, "notifications"),
            where("createdFor", "==", user.uid),
            where("createdAt", ">=", sevenDaysAgo), // 🔥 Seulement les 7 derniers jours
            orderBy("createdAt", "desc"),
            limit(50)
        );
    
        // 🔹 Exécuter les deux requêtes
        const unsubscribeUnread = handleUnreadQuery(unreadQuery, recentQuery);
    
        return () => unsubscribeUnread();
    }, [user]);

    // Mise à jour du nombre de notifications non lues
    useEffect(() => {
        setUnreadCount(notifications.filter((n) => !n.isRead).length);
    }, [notifications]);

    // Fonction pour marquer une notification comme lue (Mise à jour Firestore)
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