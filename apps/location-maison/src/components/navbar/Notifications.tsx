"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/providers/NotificationProvider";
import { BellIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/hooks/use-current-user";
import { generateColorFromName } from "@/lib/generateColorFromName";
import Link from "next/link";

// Classes CSS communes pour éviter la duplication
const CSS_CLASSES = {
  text: {
    primary: "text-gray-800 dark:text-gray-100",
    secondary: "text-gray-800 dark:text-gray-300", 
    muted: "text-gray-500 dark:text-gray-400",
    accent: "text-blue-600 dark:text-blue-400",
    dot: "text-blue-500 dark:text-blue-400"
  },
  bg: {
    read: "bg-white dark:bg-gray-900",
    unread: "bg-gray-100 dark:bg-gray-800",
    content: "dark:bg-gray-900 dark:text-gray-100",
    border: "bg-border dark:bg-gray-700"
  }
} as const;

// Composant pour l'icône de point
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
    <div className="flex flex-col items-center justify-center py-6 text-gray-500 dark:text-gray-400">
      <BellIcon size={32} className="mb-2 text-gray-400 dark:text-gray-500" />
      <p className="text-sm">Aucune notification pour le moment</p>
    </div>
  );
}

// Composant pour le contenu d'une notification
function NotificationContent({ 
  notification, 
  onMarkAsRead 
}: { 
  notification: any; 
  onMarkAsRead: (id: string) => void; 
}) {
  const handleClick = () => onMarkAsRead(notification.id ?? '');
  
  const content = (
    <span className={`${CSS_CLASSES.text.secondary} text-sm`}>
      {notification.message}
    </span>
  );

  return notification.actionUrl ? (
    <Link
      href={notification.actionUrl}
      className="hover:underline"
      onClick={handleClick}
    >
      {content}
    </Link>
  ) : (
    <button
      className="text-left"
      onClick={handleClick}
    >
      {content}
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
    <div className={`hover:bg-accent rounded-md px-3 py-2 text-sm transition-colors ${bgClass}`}>
      <div className="relative flex items-start gap-3 pe-3">
        <Avatar>
          <AvatarImage src={user?.image ?? ""} alt={`${user?.firstname} ${user?.lastname}`} />
          <AvatarFallback
            style={{ backgroundColor: avatarBackground }}
            className="text-2xl font-bold text-white"
          >
            {user?.firstname?.at(0) ?? ""}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-1">
          <h3 className={`${CSS_CLASSES.text.primary} font-semibold`}>
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
          <div className="absolute end-0 self-center">
            <Dot className={CSS_CLASSES.text.dot} />
          </div>
        )}
      </div>
    </div>
  );
}

// Composant pour l'en-tête des notifications
function NotificationsHeader({ 
  unreadCount, 
  onMarkAllAsRead 
}: { 
  unreadCount: number; 
  onMarkAllAsRead: () => void; 
}) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-4 px-3 py-2">
        <div className="text-sm font-semibold">Notifications</div>
        {unreadCount > 0 && (
          <button
            className={`text-xs font-medium ${CSS_CLASSES.text.accent} hover:underline`}
            onClick={onMarkAllAsRead}
          >
            Tout marquer comme lu
          </button>
        )}
      </div>
      <hr className={`${CSS_CLASSES.bg.border} -mx-1 my-1 h-px border-0`} />
    </>
  );
}

export default function Notifications() {
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const { user } = useCurrentUser();
  const avatarBackground = generateColorFromName(user?.firstname);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="outline" className="relative" aria-label="Ouvrir les notifications">
          <BellIcon size={16} aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 left-full min-w-5 -translate-x-1/2 rounded-full px-1 flex justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className={`w-80 p-1 ${CSS_CLASSES.bg.content}`}>
        <NotificationsHeader 
          unreadCount={unreadCount} 
          onMarkAllAsRead={markAllAsRead} 
        />

        {notifications.length === 0 ? (
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
      </PopoverContent>
    </Popover>
  );
}