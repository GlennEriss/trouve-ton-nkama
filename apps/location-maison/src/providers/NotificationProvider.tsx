'use client'

import React, { createContext, useContext, useState } from "react";
import {Notification} from "@/models/notification"

type NotificationContextType = {
    notifications: Notification[];
    unreadCount: number;
    markAllAsRead: () => void;
    markAsRead: (id: string) => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const [unreadCount, setUnreadCount] = useState(0);

    React.useEffect(() => {
        setUnreadCount(notifications.filter((n) => n.unread).length);
    }, [notifications]);

    const markAllAsRead = () => {
        setNotifications((prev) =>
            prev.map((notification) => ({ ...notification, unread: false }))
        );

    };

    const markAsRead = (id: string) => {
        setNotifications((prev) =>
            prev.map((notification) =>
                notification.id === id ? { ...notification, unread: false } : notification
            )
        );
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