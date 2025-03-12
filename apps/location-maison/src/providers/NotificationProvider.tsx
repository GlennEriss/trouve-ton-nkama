'use client';

import React, { createContext, useContext, useEffect, useState } from "react";
import { Notification } from "@/models/notification";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
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
    const user = useCurrentUser();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Récupération des notifications en temps réel
    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, "notifications"),
            where("createdFor", "==", user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedNotifications = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as Notification),
            }));
            setNotifications(fetchedNotifications);
        });

        return () => unsubscribe();
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