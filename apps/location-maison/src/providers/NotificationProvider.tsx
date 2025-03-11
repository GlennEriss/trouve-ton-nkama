'use client'

import React, { createContext, useContext, useState } from "react";

type Notification = {
    id: number;
    image: string;
    user: string;
    action: string;
    target: string;
    timestamp: string;
    unread: boolean;
};

type NotificationContextType = {
    notifications: Notification[];
    unreadCount: number;
    markAllAsRead: () => void;
    markAsRead: (id: number) => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([
        {
            id: 1,
            image: "/avatar-80-01.jpg",
            user: "Chris Tompson",
            action: "requested review on",
            target: "PR #42: Feature implementation",
            timestamp: "15 minutes ago",
            unread: true,
        },
        {
            id: 2,
            image: "/avatar-80-02.jpg",
            user: "Emma Davis",
            action: "shared",
            target: "New component library",
            timestamp: "45 minutes ago",
            unread: true,
        },
        {
            id: 3,
            image: "/avatar-80-03.jpg",
            user: "James Wilson",
            action: "assigned you to",
            target: "API integration task",
            timestamp: "4 hours ago",
            unread: false,
        },
    ]);

    const [unreadCount, setUnreadCount] = useState(0);

    React.useEffect(() => {
        setUnreadCount(notifications.filter((n) => n.unread).length);
    }, [notifications]);

    const markAllAsRead = () => {
        setNotifications((prev) =>
            prev.map((notification) => ({ ...notification, unread: false }))
        );

    };

    const markAsRead = (id: number) => {
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