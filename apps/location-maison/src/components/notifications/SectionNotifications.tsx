"use client";

import React from 'react'
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BellIcon } from "lucide-react";

const initialNotifications = [
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
];

function Dot({ className }: { className?: string }) {
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
  const [notifications, setNotifications] = useState(initialNotifications);
  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map((notification) => ({ ...notification, unread: false })));
  };

  const handleNotificationClick = (id: number) => {
    setNotifications(
      notifications.map((notification) =>
        notification.id === id ? { ...notification, unread: false } : notification
      )
    );
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <h2 className="text-lg font-semibold">Notifications</h2>
        {unreadCount > 0 && (
          <button className="text-xs font-medium text-blue-600 hover:underline" onClick={handleMarkAllAsRead}>
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Liste des notifications */}
      <div className="mt-4 space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`flex items-start gap-3 p-3 rounded-lg transition ${
              notification.unread ? "bg-gray-100" : "bg-white"
            }`}
          >
            <img
              src={notification.image}
              alt={notification.user}
              className="w-10 h-10 rounded-md"
            />
            <div className="flex-1">
              <button
                className="text-left text-sm text-gray-800 font-medium hover:underline"
                onClick={() => handleNotificationClick(notification.id)}
              >
                {notification.user} {notification.action}{" "}
                <span className="font-semibold">{notification.target}</span>.
              </button>
              <div className="text-xs text-gray-500">{notification.timestamp}</div>
            </div>
            {notification.unread && (
              <div className="self-center">
                <Dot className="text-blue-500" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Icône de notification (mobile) */}
      <div className="fixed bottom-4 right-4">
        <Button
          size="icon"
          variant="outline"
          className="relative"
          aria-label="Ouvrir les notifications"
        >
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