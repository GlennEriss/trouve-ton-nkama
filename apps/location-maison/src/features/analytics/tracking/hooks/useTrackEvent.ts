'use client';

import { useCallback } from 'react';
import { trackEvent } from '../services/tracker.service';
import { type TrackingEventName, type TrackingRoleContext } from '../domain/events';

type TrackingPrimitive = string | number | boolean;
type TrackingParams = Record<string, TrackingPrimitive | null | undefined>;

type UseTrackEventOptions = {
  roleContext?: TrackingRoleContext;
};

export function useTrackEvent(options?: UseTrackEventOptions) {
  const roleContext = options?.roleContext;

  const emit = useCallback(
    (eventName: TrackingEventName, params: TrackingParams = {}) => {
      void trackEvent(eventName, {
        ...params,
        role_context: roleContext,
      });
    },
    [roleContext]
  );

  return { trackEvent: emit };
}
