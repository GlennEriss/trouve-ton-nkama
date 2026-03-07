import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/next-auth/auth';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';
import {
  accountActivityNotificationServerService,
  type AccountActivityEventContext,
  type AccountActivityEventType,
} from '@/features/users/account-activity-notifications';

const logger = createLogger('api.users.account-activity.notify');

const ALLOWED_EVENT_TYPES: ReadonlyArray<AccountActivityEventType> = [
  'ACCOUNT_PASSWORD_CHANGED',
  'ACCOUNT_EMAIL_CHANGED',
  'ACCOUNT_PROVIDER_LINKED',
  'ACCOUNT_PROVIDER_UNLINKED',
  'ACCOUNT_PHONE_CHANGED',
  'ACCOUNT_PHONE_VERIFIED',
  'ACCOUNT_PROFILE_UPDATED',
];

function isAccountActivityEventType(value: unknown): value is AccountActivityEventType {
  return typeof value === 'string' && ALLOWED_EVENT_TYPES.includes(value as AccountActivityEventType);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const uid = session?.user?.uid;
    if (!uid) {
      return jsonApiError(401, 'UNAUTHENTICATED', 'Authentification requise.');
    }

    const body = (await request.json().catch(() => ({}))) as {
      eventType?: unknown;
      eventId?: unknown;
      context?: unknown;
    };

    if (!isAccountActivityEventType(body.eventType)) {
      return jsonApiError(400, 'INVALID_EVENT_TYPE', "Type d'évènement d'activité compte invalide.");
    }

    const eventId =
      typeof body.eventId === 'string' && body.eventId.trim() ? body.eventId.trim() : undefined;
    const context: AccountActivityEventContext | undefined =
      body.context && typeof body.context === 'object' && !Array.isArray(body.context)
        ? (body.context as AccountActivityEventContext)
        : undefined;

    const result = await accountActivityNotificationServerService.dispatch({
      uid,
      eventType: body.eventType,
      eventId,
      context,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/users/account-activity/notify',
      fallbackMessage: "Impossible de traiter l'activité de compte.",
    });
  }
}

