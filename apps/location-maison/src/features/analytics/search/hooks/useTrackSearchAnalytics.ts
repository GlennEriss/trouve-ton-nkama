'use client';

import { useMemo, useEffect } from 'react';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { trackSearchAnalytics } from '../services/search-admin-analytics.client';

type UseTrackSearchAnalyticsInput = {
  searchParams: ReadonlyURLSearchParams;
  nbHits: number;
  searchStatus: string;
};

export function useTrackSearchAnalytics(input: UseTrackSearchAnalyticsInput) {
  const { data: session, status } = useSession();

  const serializedSearchParams = useMemo(() => input.searchParams.toString(), [input.searchParams]);
  const isAuthenticated = status === 'authenticated';
  const uid = useMemo(() => {
    const user = session?.user as { uid?: unknown } | undefined;
    return typeof user?.uid === 'string' ? user.uid : null;
  }, [session?.user]);

  useEffect(() => {
    void trackSearchAnalytics({
      searchParams: new URLSearchParams(serializedSearchParams),
      nbHits: input.nbHits,
      searchStatus: input.searchStatus,
      actor: {
        uid,
        isAuthenticated,
      },
    });
  }, [serializedSearchParams, input.nbHits, input.searchStatus, uid, isAuthenticated]);
}

