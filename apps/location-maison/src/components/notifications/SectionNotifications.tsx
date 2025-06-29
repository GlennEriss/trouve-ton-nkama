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

// Icône de notification non lue
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

export default function SectionNotifications() {
  const { user } = useCurrentUser();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const avatarBackground = generateColorFromName(user?.firstname);

  return (
    <div className="max-w-xl mx-auto p-4">
      {/* Header */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-between pb-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notifications</h2>
          {unreadCount > 0 && (
            <button className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline" onClick={markAllAsRead}>
              Tout marquer comme lu
            </button>
          )}
        </div>
      )}

      {/* Liste des notifications */}
      <div className="mt-4 space-y-3">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-gray-500 dark:text-gray-400">
            <BellIcon size={60} className="mb-2 text-gray-400 dark:text-gray-500" />
            <p className="text-sm">Vous n'avez aucune notification pour le moment.</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start gap-3 p-3 rounded-lg transition ${notification.isRead ? "bg-white dark:bg-gray-900" : "bg-gray-100 dark:bg-gray-800"
                }`}
            >
              {/* Avatar */}
              <Avatar>
                <AvatarImage src={user?.image ?? ""} alt={`${user?.firstname} ${user?.lastname}`} />
                <AvatarFallback
                  style={{ backgroundColor: avatarBackground }}
                  className="text-2xl font-bold text-white"
                >
                  {user?.firstname?.at(0) ?? ""}
                </AvatarFallback>
              </Avatar>

              {/* Contenu de la notification */}
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {notification.title}
                </h3>
                {notification.actionUrl ? (
                  <Link
                    href={notification.actionUrl}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={() => markAsRead(notification.id ?? '')}
                  >
                    {notification.message}
                  </Link>
                ) : (
                  <button
                    className="text-sm text-gray-800 dark:text-gray-300 text-left"
                    onClick={() => markAsRead(notification.id ?? '')}
                  >
                    {notification.message}
                  </button>
                )}
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {notification.createdAt
                    ? (notification.createdAt instanceof Date
                      ? notification.createdAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
                      : new Date(notification.createdAt.seconds * 1000).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }))
                    : "Date inconnue"}
                </div>
              </div>

              {/* Indicateur de non-lu */}
              {!notification.isRead && (
                <div className="self-center">
                  <Dot className="text-blue-500 dark:text-blue-400" />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Icône de notification (mobile) */}
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
    </div>
  );
}