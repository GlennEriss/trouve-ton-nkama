"use client";

import React from "react";
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
    <div className={`flex items-center justify-between pb-4 border-b ${NOTIFICATION_CSS_CLASSES.bg.borderSection}`}>
      <h2 className={`text-lg font-semibold ${NOTIFICATION_CSS_CLASSES.text.primarySection}`}>
        Notifications
      </h2>
      {unreadCount > 0 && (
        <button 
          className={`text-xs font-medium ${NOTIFICATION_CSS_CLASSES.text.accent} hover:underline`} 
          onClick={onMarkAllAsRead}
        >
          Tout marquer comme lu
        </button>
      )}
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
          <EmptyNotificationsState iconSize={60} />
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              user={user}
              avatarBackground={avatarBackground}
              onMarkAsRead={markAsRead}
              variant="section"
            />
          ))
        )}
      </div>

      <NotificationButton 
        unreadCount={unreadCount} 
        iconSize={20}
        variant="floating"
      />
    </div>
  );
}