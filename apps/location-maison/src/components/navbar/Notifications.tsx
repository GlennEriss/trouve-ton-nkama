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

function formatNotificationDate(createdAt: any): string {
  if (!createdAt) {
    return "Date inconnue";
  }
  
  if (createdAt instanceof Date) {
    return createdAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  }
  
  return new Date(createdAt.seconds * 1000).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
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

      <PopoverContent className="w-80 p-1 dark:bg-gray-900 dark:text-gray-100">
        <div className="flex items-baseline justify-between gap-4 px-3 py-2">
          <div className="text-sm font-semibold">Notifications</div>
          {unreadCount > 0 && (
            <button
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              onClick={markAllAsRead}
            >
              Tout marquer comme lu
            </button>
          )}
        </div>
        <hr className="bg-border dark:bg-gray-700 -mx-1 my-1 h-px border-0" />

        {/* Aucune notification */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-gray-500 dark:text-gray-400">
            <BellIcon size={32} className="mb-2 text-gray-400 dark:text-gray-500" />
            <p className="text-sm">Aucune notification pour le moment</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`hover:bg-accent rounded-md px-3 py-2 text-sm transition-colors ${notification.isRead ? "bg-white dark:bg-gray-900" : "bg-gray-100 dark:bg-gray-800"
                }`}
            >
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
                  <h3 className="text-gray-800 dark:text-gray-100 font-semibold">{notification.title}</h3>
                  {notification.actionUrl ? (
                    <Link
                      href={notification.actionUrl}
                      className="text-gray-800 dark:text-gray-300 text-sm hover:underline"
                      onClick={() => markAsRead(notification.id ?? '')}
                    >
                      {notification.message}
                    </Link>
                  ) : (
                    <button
                      className="text-gray-800 dark:text-gray-300 text-sm text-left"
                      onClick={() => markAsRead(notification.id ?? '')}
                    >
                      {notification.message}
                    </button>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatNotificationDate(notification.createdAt)}
                  </div>
                </div>
                {!notification.isRead && (
                  <div className="absolute end-0 self-center">
                    <Dot className="text-blue-500 dark:text-blue-400" />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}