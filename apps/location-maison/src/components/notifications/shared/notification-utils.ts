// Classes CSS communes pour les composants de notifications
export const NOTIFICATION_CSS_CLASSES = {
  text: {
    primary: "text-gray-800 dark:text-gray-100",
    primarySection: "text-gray-900 dark:text-gray-100",
    secondary: "text-gray-800 dark:text-gray-300", 
    muted: "text-gray-500 dark:text-gray-400",
    accent: "text-blue-600 dark:text-blue-400",
    dot: "text-blue-500 dark:text-blue-400"
  },
  bg: {
    read: "bg-white dark:bg-gray-900",
    unread: "bg-gray-100 dark:bg-gray-800",
    content: "dark:bg-gray-900 dark:text-gray-100",
    border: "bg-border dark:bg-gray-700",
    borderSection: "dark:border-gray-700"
  }
} as const;

// Fonction utilitaire pour formater les dates de notification
export function formatNotificationDate(createdAt: any): string {
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