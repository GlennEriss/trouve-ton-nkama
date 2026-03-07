'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  setTrackingUserContext,
  trackPageView,
} from '../services/tracker.service';
import type { TrackingRoleContext } from '../domain/events';

function resolveRoleContext(user: any): TrackingRoleContext {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  if (roles.includes('Announcer')) {
    return 'announcer';
  }
  if (user?.uid) {
    return 'user';
  }
  return 'visitor';
}

export function FirebaseAnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const lastTrackedPathRef = useRef<string | null>(null);

  const search = useMemo(() => {
    const raw = searchParams?.toString();
    return raw ? `?${raw}` : '';
  }, [searchParams]);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const currentPath = `${pathname}${search}`;
    if (lastTrackedPathRef.current === currentPath) {
      return;
    }
    lastTrackedPathRef.current = currentPath;

    void trackPageView({
      pathname,
      search,
      title: typeof document !== 'undefined' ? document.title : undefined,
    });
  }, [pathname, search]);

  useEffect(() => {
    const user = session?.user as any;
    const uid = typeof user?.uid === 'string' ? user.uid : null;
    const roleContext = resolveRoleContext(user);
    void setTrackingUserContext(uid, roleContext);
  }, [session?.user]);

  return null;
}
