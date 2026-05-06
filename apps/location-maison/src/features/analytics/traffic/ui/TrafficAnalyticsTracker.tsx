'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { trackTrafficPage } from '@/features/analytics/traffic/services/traffic-admin-analytics.client';

export function TrafficAnalyticsTracker() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const isAuthenticated = status === 'authenticated';
  const uid = useMemo(() => {
    const user = session?.user as { uid?: unknown } | undefined;
    return typeof user?.uid === 'string' ? user.uid : null;
  }, [session?.user]);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    trackTrafficPage({
      pathname,
      actor: {
        uid,
        isAuthenticated,
      },
    });
  }, [pathname, uid, isAuthenticated]);

  return null;
}
