'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

import {
  getPresenceSessionId,
  resolvePresenceSource,
  sendPresenceHeartbeat,
} from '@/features/analytics/presence/services/presence-admin-analytics.client';

const HEARTBEAT_INTERVAL_MS = 60_000;
const MIN_EMIT_GAP_MS = 10_000;

export function PresenceAnalyticsTracker() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const lastEmitAtRef = useRef(0);

  const source = useMemo(() => resolvePresenceSource(pathname || '/'), [pathname]);
  const isAuthenticated = status === 'authenticated';
  const uid = useMemo(() => {
    const user = session?.user as { uid?: unknown } | undefined;
    return typeof user?.uid === 'string' ? user.uid : null;
  }, [session?.user]);

  useEffect(() => {
    const sessionId = getPresenceSessionId();

    const emit = (presenceStatus: 'online' | 'offline', keepalive = false) => {
      const now = Date.now();
      if (presenceStatus === 'online' && now - lastEmitAtRef.current < MIN_EMIT_GAP_MS) {
        return;
      }

      if (presenceStatus === 'online') {
        lastEmitAtRef.current = now;
      }

      void sendPresenceHeartbeat({
        source,
        status: presenceStatus,
        sessionId,
        actor: {
          uid,
          isAuthenticated,
        },
        keepalive,
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        emit('online');
      } else {
        emit('offline', true);
      }
    };

    const handlePageHide = () => {
      emit('offline', true);
    };

    emit('online');

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      emit('online');
    }, HEARTBEAT_INTERVAL_MS);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, [source, uid, isAuthenticated]);

  return null;
}
