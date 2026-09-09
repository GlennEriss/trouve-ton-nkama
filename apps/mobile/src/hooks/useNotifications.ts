import { useEffect, useMemo, useState } from 'react';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, type QuerySnapshot, type DocumentData } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

// Miroir de NotificationProvider.tsx (web) — même stratégie 2 requêtes + fusion côté client,
// portée telle quelle car le bug qu'elle corrige (fenêtre "récent" figée sur un onglet resté
// ouvert plusieurs jours) s'applique de la même façon à une app mobile restée en arrière-plan.
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const RECENT_WINDOW_REFRESH_MS = 15 * 60 * 1000;

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  type: 'BOOKMARKING' | 'SECURITY' | 'ANNOUNCEMENT' | 'MODERATION' | 'GIFT';
  isRead: boolean;
  createdFor: string;
  actionUrl?: string;
  idProperty?: string;
  createdAt?: { toMillis: () => number } | { seconds: number; nanoseconds: number };
};

// Exportées pour être testées isolément (src/hooks/__tests__/notificationsMerge.test.ts) sans
// monter le hook lui-même : monter un composant React (renderHook/react-test-renderer) dans
// cet environnement Jest fait un vrai deadlock (conflit de résolution Haste probable, avec les
// multiples copies de react-native imbriquées dans ce monorepo) — la logique de fusion, qui a
// un historique de bug réel côté web (fenêtre figée), reste testée en isolation totale.
export function createdAtToMillis(createdAt: AppNotification['createdAt']): number {
  if (!createdAt) return 0;
  if ('toMillis' in createdAt) return createdAt.toMillis();
  return typeof createdAt.seconds === 'number' ? createdAt.seconds * 1000 : 0;
}

function mapDocs(snapshot: QuerySnapshot<DocumentData>): AppNotification[] {
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AppNotification, 'id'>) }));
}

export function mergeNotifications(unread: AppNotification[], recent: AppNotification[]): AppNotification[] {
  const cutoffMs = Date.now() - RECENT_WINDOW_MS;
  const filteredRecent = recent.filter(
    (n) => !unread.some((u) => u.id === n.id) && createdAtToMillis(n.createdAt) >= cutoffMs,
  );
  return [...unread, ...filteredRecent];
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const uid = getAuth().currentUser?.uid;
    if (!uid) return;

    const db = getFirestore();
    const unreadQuery = query(
      collection(db, 'notifications'),
      where('createdFor', '==', uid),
      where('isRead', '==', false),
      orderBy('createdAt', 'desc'),
      limit(50),
    );
    const recentQuery = query(
      collection(db, 'notifications'),
      where('createdFor', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(50),
    );

    let unread: AppNotification[] = [];
    let recent: AppNotification[] = [];
    const sync = () => setNotifications(mergeNotifications(unread, recent));

    const unsubscribeUnread = onSnapshot(unreadQuery, (snapshot) => {
      unread = mapDocs(snapshot);
      sync();
    });
    const unsubscribeRecent = onSnapshot(recentQuery, (snapshot) => {
      recent = mapDocs(snapshot);
      sync();
    });
    const refreshIntervalId = setInterval(sync, RECENT_WINDOW_REFRESH_MS);

    return () => {
      clearInterval(refreshIntervalId);
      unsubscribeUnread();
      unsubscribeRecent();
    };
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    await updateDoc(doc(getFirestore(), 'notifications', id), { isRead: true });
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await Promise.all(unread.map((n) => updateDoc(doc(getFirestore(), 'notifications', n.id), { isRead: true })));
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
