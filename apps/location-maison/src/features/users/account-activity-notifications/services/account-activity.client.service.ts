import { createLogger } from '@/lib/logger';
import type {
  AccountActivityDispatchResult,
  AccountActivityEventContext,
  AccountActivityEventType,
} from './account-activity-notification.service.interface';

const logger = createLogger('users.account-activity.client-service');

type DispatchAccountActivityClientInput = {
  eventType: AccountActivityEventType;
  eventId?: string;
  context?: AccountActivityEventContext;
};

export async function dispatchAccountActivityFromClient(
  input: DispatchAccountActivityClientInput
): Promise<AccountActivityDispatchResult | null> {
  // Les services métiers sont testés en runtime Node (unit tests). On ne tente pas
  // d'appeler une route relative hors navigateur.
  if (typeof window === 'undefined' || typeof fetch !== 'function') {
    return null;
  }

  try {
    const response = await fetch('/api/users/account-activity/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    const payload = (await response.json().catch(() => null)) as
      | { success?: boolean; data?: AccountActivityDispatchResult }
      | null;

    if (!response.ok) {
      logger.warn('Account activity client dispatch rejected', {
        status: response.status,
        statusText: response.statusText,
        eventType: input.eventType,
        eventId: input.eventId,
      });
      return null;
    }

    return payload?.data ?? null;
  } catch (error) {
    logger.warn('Account activity client dispatch failed', {
      eventType: input.eventType,
      eventId: input.eventId,
      error,
    });
    return null;
  }
}
