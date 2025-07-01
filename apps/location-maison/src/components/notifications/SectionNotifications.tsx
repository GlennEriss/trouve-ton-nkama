"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/providers/NotificationProvider";
import { BellIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/hooks/use-current-user";
import { generateColorFromName } from "@/lib/generateColorFromName";
import Link from "next/link";

// Classes CSS communes pour éviter la duplication
const CSS_CLASSES = {
  text: {
    primary: "text-gray-900 dark:text-gray-100",
    secondary: "text-gray-800 dark:text-gray-300",
    muted: "text-gray-500 dark:text-gray-400",
    accent: "text-blue-600 dark:text-blue-400",
    dot: "text-blue-500 dark:text-blue-400"
  },
  bg: {
    read: "bg-white dark:bg-gray-900",
    unread: "bg-gray-100 dark:bg-gray-800",
    border: "dark:border-gray-700"
  }
} as const;

// Composant pour l'icône de point (notification non lue)
function Dot({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      width="6"
      height="6"
      fill="currentColor"
      viewBox="0 0 6 6"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="3" cy="3" r="3" />
    </svg>
  );
}

// Fonction utilitaire pour formater les dates
function formatNotificationDate(createdAt: any): string {
  if (!createdAt) return "Date inconnue";
  
  const date = createdAt instanceof Date 
    ? createdAt 
    : new Date(createdAt.seconds * 1000);
    
  return date.toLocaleDateString("fr-FR", { 
    day: "2-digit", 
    month: "long", 
    year: "numeric" 
  });
}

// Composant pour l'état vide des notifications
function EmptyNotificationsState() {
  return (
    <div className={`flex flex-col items-center justify-center py-6 ${CSS_CLASSES.text.muted}`}>
      <BellIcon size={60} className="mb-2 text-gray-400 dark:text-gray-500" />
      <p className="text-sm">Vous n'avez aucune notification pour le moment.</p>
    </div>
  );
}

// Composant pour l'avatar utilisateur
function UserAvatar({ user, avatarBackground }: { 
  user: any; 
  avatarBackground: string; 
}) {
  return (
    <Avatar>
      <AvatarImage src={user?.image ?? ""} alt={`${user?.firstname} ${user?.lastname}`} />
      <AvatarFallback
        style={{ backgroundColor: avatarBackground }}
        className="text-2xl font-bold text-white"
      >
        {user?.firstname?.at(0) ?? ""}
      </AvatarFallback>
    </Avatar>
  );
}

// Composant pour le contenu cliquable d'une notification
function NotificationContent({ 
  notification, 
  onMarkAsRead 
}: { 
  notification: any; 
  onMarkAsRead: (id: string) => void; 
}) {
  const handleClick = () => onMarkAsRead(notification.id ?? '');
  
  return notification.actionUrl ? (
    <Link
      href={notification.actionUrl}
      className={`text-sm ${CSS_CLASSES.text.accent} hover:underline`}
      onClick={handleClick}
    >
      {notification.message}
    </Link>
  ) : (
    <button
      className={`text-sm ${CSS_CLASSES.text.secondary} text-left`}
      onClick={handleClick}
    >
      {notification.message}
    </button>
  );
}

// Composant pour une notification individuelle
function NotificationItem({ 
  notification, 
  user, 
  avatarBackground, 
  onMarkAsRead 
}: {
  notification: any;
  user: any;
  avatarBackground: string;
  onMarkAsRead: (id: string) => void;
}) {
  const bgClass = notification.isRead ? CSS_CLASSES.bg.read : CSS_CLASSES.bg.unread;
  
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg transition ${bgClass}`}>
      <UserAvatar user={user} avatarBackground={avatarBackground} />
      
      <div className="flex-1">
        <h3 className={`text-sm font-semibold ${CSS_CLASSES.text.primary}`}>
          {notification.title}
        </h3>
        
        <NotificationContent 
          notification={notification} 
          onMarkAsRead={onMarkAsRead} 
        />
        
        <div className={`text-xs ${CSS_CLASSES.text.muted}`}>
          {formatNotificationDate(notification.createdAt)}
        </div>
      </div>

      {!notification.isRead && (
        <div className="self-center">
          <Dot className={CSS_CLASSES.text.dot} />
        </div>
      )}
    </div>
  );
}

// Composant pour l'en-tête des notifications
function NotificationsHeader({ 
  hasNotifications, 
  unreadCount, 
  onMarkAllAsRead 
}: { 
  hasNotifications: boolean; 
  unreadCount: number; 
  onMarkAllAsRead: () => void; 
}) {
  if (!hasNotifications) return null;

  return (
    <div className={`flex items-center justify-between pb-4 border-b ${CSS_CLASSES.bg.border}`}>
      <h2 className={`text-lg font-semibold ${CSS_CLASSES.text.primary}`}>
        Notifications
      </h2>
      {unreadCount > 0 && (
        <button 
          className={`text-xs font-medium ${CSS_CLASSES.text.accent} hover:underline`} 
          onClick={onMarkAllAsRead}
        >
          Tout marquer comme lu
        </button>
      )}
    </div>
  );
}

// Composant pour le bouton flottant de notifications
function FloatingNotificationButton({ unreadCount }: { unreadCount: number }) {
  return (
    <div className="fixed bottom-4 right-4">
      <Button size="icon" variant="outline" className="relative" aria-label="Ouvrir les notifications">
        <BellIcon size={20} aria-hidden="true" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 right-0 min-w-5 rounded-full px-1 flex justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>
    </div>
  );
}

export default function SectionNotifications() {
  const { user } = useCurrentUser();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const avatarBackground = generateColorFromName(user?.firstname);
  const hasNotifications = notifications.length > 0;

  return (
    <div className="max-w-xl mx-auto p-4">
      <NotificationsHeader 
        hasNotifications={hasNotifications}
        unreadCount={unreadCount}
        onMarkAllAsRead={markAllAsRead}
      />

      <div className="mt-4 space-y-3">
        {!hasNotifications ? (
          <EmptyNotificationsState />
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              user={user}
              avatarBackground={avatarBackground}
              onMarkAsRead={markAsRead}
            />
          ))
        )}
      </div>

      <FloatingNotificationButton unreadCount={unreadCount} />
    </div>
  );
}