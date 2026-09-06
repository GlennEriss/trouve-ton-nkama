import React from "react";
import { BellIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@trouve-ton-nkama/ui/avatar";
import { Badge } from "@trouve-ton-nkama/ui/badge";
import { Button } from "@trouve-ton-nkama/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { NOTIFICATION_CSS_CLASSES, formatNotificationDate } from "./notification-utils";

// Composant pour l'icône de point (notification non lue)
export function NotificationDot({ className }: Readonly<{ className?: string }>) {
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

// Composant pour l'état vide des notifications
export function EmptyNotificationsState({
  iconSize = 32,
  showSettingsLink = false,
}: {
  iconSize?: number;
  showSettingsLink?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-6 ${NOTIFICATION_CSS_CLASSES.text.muted}`}>
      <BellIcon size={iconSize} className="mb-2 text-gray-400 dark:text-gray-500" />
      <p className="text-sm">
        {iconSize > 40 
          ? "Vous n'avez aucune notification pour le moment." 
          : "Aucune notification pour le moment"
        }
      </p>
      {showSettingsLink && (
        <Button asChild variant="outline" className="mt-5 h-11 rounded-full px-5">
          <Link href="/settings">Gérer mes préférences</Link>
        </Button>
      )}
    </div>
  );
}

// Composant pour l'avatar utilisateur
export function UserAvatar({ 
  user, 
  avatarBackground, 
  size = "default" 
}: { 
  user: any; 
  avatarBackground: string;
  size?: "default" | "sm";
}) {
  return (
    <Avatar className={size === "sm" ? "w-8 h-8" : ""}>
      <AvatarImage src={user?.image ?? ""} alt={`${user?.firstname} ${user?.lastname}`} />
      <AvatarFallback
        style={{ backgroundColor: avatarBackground }}
        className={`font-bold text-white ${size === "sm" ? "text-sm" : "text-2xl"}`}
      >
        {user?.firstname?.at(0) ?? ""}
      </AvatarFallback>
    </Avatar>
  );
}

// Composant pour le contenu cliquable d'une notification
export function NotificationContent({ 
  notification, 
  onMarkAsRead,
  textSize = "text-sm",
  showAsSpan = false
}: { 
  notification: any; 
  onMarkAsRead: (id: string) => void;
  textSize?: string;
  showAsSpan?: boolean;
}) {
  const handleClick = () => onMarkAsRead(notification.id ?? '');
  
  const content = showAsSpan ? (
    <span className={`${NOTIFICATION_CSS_CLASSES.text.secondary} ${textSize}`}>
      {notification.message}
    </span>
  ) : (
    notification.message
  );

  return notification.actionUrl ? (
    <Link
      href={notification.actionUrl}
      className={`${textSize} ${NOTIFICATION_CSS_CLASSES.text.accent} hover:underline`}
      onClick={handleClick}
    >
      {content}
    </Link>
  ) : (
    <button
      className={`${textSize} ${NOTIFICATION_CSS_CLASSES.text.secondary} text-left`}
      onClick={handleClick}
    >
      {content}
    </button>
  );
}

// Composant pour une notification individuelle
export function NotificationItem({ 
  notification, 
  user, 
  avatarBackground, 
  onMarkAsRead,
  variant = "popover"
}: {
  notification: any;
  user: any;
  avatarBackground: string;
  onMarkAsRead: (id: string) => void;
  variant?: "popover" | "section";
}) {
  const bgClass = notification.isRead 
    ? NOTIFICATION_CSS_CLASSES.bg.read 
    : NOTIFICATION_CSS_CLASSES.bg.unread;
  
  const primaryTextClass = variant === "section" 
    ? NOTIFICATION_CSS_CLASSES.text.primarySection 
    : NOTIFICATION_CSS_CLASSES.text.primary;

  const containerClass = variant === "popover" 
    ? `hover:bg-accent rounded-md px-3 py-2 text-sm transition-colors ${bgClass}`
    : `flex items-start gap-3 p-3 rounded-lg transition ${bgClass}`;

  return (
    <div className={containerClass}>
      {variant === "popover" ? (
        <div className="relative flex items-start gap-3 pe-3">
          <UserAvatar user={user} avatarBackground={avatarBackground} />
          
          <div className="flex-1 space-y-1">
            <h3 className={`${primaryTextClass} font-semibold`}>
              {notification.title}
            </h3>
            
            <NotificationContent 
              notification={notification} 
              onMarkAsRead={onMarkAsRead}
              showAsSpan={true}
            />
            
            <div className={`text-xs ${NOTIFICATION_CSS_CLASSES.text.muted}`}>
              {formatNotificationDate(notification.createdAt)}
            </div>
          </div>
          
          {!notification.isRead && (
            <div className="absolute end-0 self-center">
              <NotificationDot className={NOTIFICATION_CSS_CLASSES.text.dot} />
            </div>
          )}
        </div>
      ) : (
        <>
          <UserAvatar user={user} avatarBackground={avatarBackground} />
          
          <div className="flex-1">
            <h3 className={`text-sm font-semibold ${primaryTextClass}`}>
              {notification.title}
            </h3>
            
            <NotificationContent 
              notification={notification} 
              onMarkAsRead={onMarkAsRead} 
            />
            
            <div className={`text-xs ${NOTIFICATION_CSS_CLASSES.text.muted}`}>
              {formatNotificationDate(notification.createdAt)}
            </div>
          </div>

          {!notification.isRead && (
            <div className="self-center">
              <NotificationDot className={NOTIFICATION_CSS_CLASSES.text.dot} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Composant pour le bouton de notification avec badge
// `...rest` (via ButtonHTMLAttributes) est indispensable : ce composant est utilisé comme enfant
// de <PopoverTrigger asChild> (Notifications.tsx), qui clone dessus onClick/aria-expanded/
// aria-haspopup/data-state pour piloter l'ouverture du popover. Sans les répercuter sur le
// <Button> réel, ils étaient silencieusement perdus et le clic ne faisait plus rien.
type NotificationButtonProps = {
  unreadCount: number;
  iconSize?: number;
  variant?: "icon" | "floating";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const NotificationButton = React.forwardRef<HTMLButtonElement, NotificationButtonProps>(function NotificationButton({
  unreadCount,
  iconSize = 16,
  variant = "icon",
  className = "",
  ...rest
}, ref) {
  const buttonClass = variant === "floating" 
    ? "fixed bottom-4 right-4"
    : "relative inline-flex";

  const iconVariantClass =
    "h-11 w-11 rounded-full border border-primary-100 bg-white text-primary shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-secondary hover:bg-primary-100 hover:text-primary-800 hover:shadow-md focus-visible:ring-2 focus-visible:ring-secondary/30 dark:border-gray-700 dark:bg-gray-900 dark:text-primary-200 dark:hover:border-secondary/70 dark:hover:bg-gray-800";

  const floatingVariantClass =
    "h-12 w-12 rounded-full border border-secondary/30 bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:brightness-110";

  return (
    <Button
      ref={ref}
      size="icon"
      variant={variant === "floating" ? "default" : "outline"}
      className={cn(
        buttonClass,
        variant === "floating" ? floatingVariantClass : iconVariantClass,
        unreadCount > 0 && variant !== "floating" && "ring-2 ring-secondary/25 ring-offset-1",
        className
      )}
      aria-label="Ouvrir les notifications"
      type="button"
      {...rest}
    >
      <BellIcon size={iconSize} aria-hidden="true" />
      {unreadCount > 0 && (
        <Badge className={`absolute min-w-5 rounded-full border border-white px-1 flex justify-center ${
          variant === "floating"
            ? "-top-2 right-0"
            : "-top-1.5 left-full -translate-x-1/2 bg-red-500 text-white"
        }`}>
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  );
})
