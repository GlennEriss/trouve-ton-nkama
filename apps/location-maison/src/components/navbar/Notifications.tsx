"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/providers/NotificationProvider";
import { useCurrentUser } from "@/hooks/use-current-user";
import { generateColorFromName } from "@/lib/generateColorFromName";
import { 
  EmptyNotificationsState, 
  NotificationItem, 
  NotificationButton 
} from "@/components/notifications/shared/NotificationComponents";
import { NOTIFICATION_CSS_CLASSES } from "@/components/notifications/shared/notification-utils";

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
            className={`text-xs font-medium ${NOTIFICATION_CSS_CLASSES.text.accent} hover:underline`}
            onClick={onMarkAllAsRead}
          >
            Tout marquer comme lu
          </button>
        )}
      </div>
      <hr className={`${NOTIFICATION_CSS_CLASSES.bg.border} -mx-1 my-1 h-px border-0`} />
    </>
  );
}

export default function Notifications() {
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const { user } = useCurrentUser();
  const avatarBackground = generateColorFromName(user?.firstname);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <NotificationButton unreadCount={unreadCount} />
        </div>
      </PopoverTrigger>

      <PopoverContent className={`w-80 p-1 ${NOTIFICATION_CSS_CLASSES.bg.content}`}>
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
              variant="popover"
            />
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}