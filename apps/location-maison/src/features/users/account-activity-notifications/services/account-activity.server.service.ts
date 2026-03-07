import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import { adminApp } from '@/firebase/admin';
import { createLogger } from '@/lib/logger';
import { EmailService, emailService } from '@/services/email.service';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { resolveAccountActivityPolicy } from './account-activity-policy';
import type {
  AccountActivityDispatchResult,
  AccountActivityEventType,
  AccountActivityNotificationServerService,
  DispatchAccountActivityInput,
} from './account-activity-notification.service.interface';

const logger = createLogger('users.account-activity.server-service');
const ACCOUNT_ACTIVITY_DISPATCH_COLLECTION = 'account_activity_dispatch';

type UserNotificationParameter = {
  isAccountActivity?: boolean;
};

type UserRecord = {
  uid: string;
  email?: string | null;
  firstname?: string;
  lastname?: string;
  notificationParameter?: UserNotificationParameter;
};

function sanitizeDocId(value: string): string {
  return value.replace(/[^\w.-]/g, '_').slice(0, 180);
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function buildNotificationPayload(
  eventType: AccountActivityEventType,
  context: DispatchAccountActivityInput['context']
): { title: string; message: string; actionUrl: string } {
  const provider = context?.provider;
  const changedFields = Array.isArray(context?.changedFields)
    ? context?.changedFields.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
  const actionUrl = typeof context?.actionUrl === 'string' && context.actionUrl.trim()
    ? context.actionUrl.trim()
    : '/settings';

  switch (eventType) {
    case 'ACCOUNT_PASSWORD_CHANGED':
      return {
        title: 'Mot de passe modifié',
        message:
          'Le mot de passe de votre compte a été modifié. Si ce n’était pas vous, contactez immédiatement le support.',
        actionUrl,
      };
    case 'ACCOUNT_EMAIL_CHANGED':
      return {
        title: 'Adresse email modifiée',
        message:
          'L’adresse email de votre compte a été modifiée. Vérifiez cette activité dans vos paramètres de sécurité.',
        actionUrl,
      };
    case 'ACCOUNT_PROVIDER_LINKED':
      return {
        title: 'Méthode de connexion ajoutée',
        message: provider
          ? `La méthode ${provider} a été liée à votre compte.`
          : 'Une nouvelle méthode de connexion a été liée à votre compte.',
        actionUrl,
      };
    case 'ACCOUNT_PROVIDER_UNLINKED':
      return {
        title: 'Méthode de connexion retirée',
        message: provider
          ? `La méthode ${provider} a été retirée de votre compte.`
          : 'Une méthode de connexion a été retirée de votre compte.',
        actionUrl,
      };
    case 'ACCOUNT_PHONE_CHANGED':
      return {
        title: 'Numéro de téléphone modifié',
        message:
          'Le numéro de téléphone associé à votre compte a été modifié.',
        actionUrl,
      };
    case 'ACCOUNT_PHONE_VERIFIED':
      return {
        title: 'Numéro de téléphone vérifié',
        message:
          'Votre numéro de téléphone a été vérifié avec succès.',
        actionUrl,
      };
    case 'ACCOUNT_PROFILE_UPDATED':
      return {
        title: 'Profil mis à jour',
        message: changedFields.length > 0
          ? `Les informations suivantes ont été mises à jour: ${changedFields.join(', ')}.`
          : 'Vos informations de profil ont été mises à jour.',
        actionUrl,
      };
    default:
      return {
        title: 'Activité du compte',
        message: 'Une activité a été détectée sur votre compte.',
        actionUrl,
      };
  }
}

function buildEmailContent(payload: { title: string; message: string; actionUrl: string }) {
  const host = process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000';
  const actionUrl = payload.actionUrl.startsWith('http')
    ? payload.actionUrl
    : `${host}${payload.actionUrl}`;

  const subject = `[Sécurité compte] ${payload.title} - Trouve Ton Nkama`;
  const text = [
    payload.title,
    '',
    payload.message,
    '',
    `Consulter votre compte: ${actionUrl}`,
    '',
    "Si vous n'êtes pas à l'origine de cette action, contactez le support immédiatement.",
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <h2 style="margin: 0 0 12px; color: #146B67;">${payload.title}</h2>
      <p style="margin: 0 0 12px;">${payload.message}</p>
      <p style="margin: 0 0 16px;">
        <a href="${actionUrl}" style="background:#146B67;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;display:inline-block;">
          Ouvrir mes paramètres
        </a>
      </p>
      <p style="font-size: 13px; color: #475569; margin: 0;">
        Si vous n'êtes pas à l'origine de cette action, contactez le support immédiatement.
      </p>
    </div>
  `;

  return { subject, text, html };
}

async function getUserByUid(uid: string): Promise<UserRecord | null> {
  const db = getFirestore(adminApp as any);
  const snapshot = await db
    .collection(firebaseCollectionNames.users)
    .where('uid', '==', uid)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const data = snapshot.docs[0].data() as UserRecord;
  return {
    uid,
    email: data.email ?? null,
    firstname: data.firstname,
    lastname: data.lastname,
    notificationParameter: data.notificationParameter,
  };
}

async function markEventAsDispatched(input: DispatchAccountActivityInput): Promise<boolean> {
  if (!input.eventId) {
    return true;
  }

  const db = getFirestore(adminApp as any);
  const docId = sanitizeDocId(`${input.uid}:${input.eventType}:${input.eventId}`);
  const ref = db.collection(ACCOUNT_ACTIVITY_DISPATCH_COLLECTION).doc(docId);
  try {
    await ref.create({
      uid: input.uid,
      eventType: input.eventType,
      eventId: input.eventId,
      createdAt: FieldValue.serverTimestamp(),
    });
    return true;
  } catch (error: unknown) {
    const code = (error as { code?: unknown })?.code;
    if (code === 6 || code === 'already-exists') {
      return false;
    }
    throw error;
  }
}

export class AccountActivityNotificationServerServiceImpl
  implements AccountActivityNotificationServerService {
  async dispatch(input: DispatchAccountActivityInput): Promise<AccountActivityDispatchResult> {
    const uid = input.uid.trim();
    if (!uid) {
      return {
        success: false,
        skipped: true,
        reason: 'missing_uid',
        severity: 'LOW',
        channelsSent: [],
        channelsSkipped: ['in_app', 'email'],
      };
    }

    const unique = await markEventAsDispatched(input);
    if (!unique) {
      logger.info('Account activity ignored (duplicate event)', {
        uid,
        eventType: input.eventType,
        eventId: input.eventId,
      });
      return {
        success: true,
        skipped: true,
        reason: 'duplicate_event',
        severity: 'LOW',
        channelsSent: [],
        channelsSkipped: ['in_app', 'email'],
      };
    }

    const user = await getUserByUid(uid);
    if (!user) {
      logger.warn('Account activity ignored (user not found)', {
        uid,
        eventType: input.eventType,
      });
      return {
        success: false,
        skipped: true,
        reason: 'user_not_found',
        severity: 'LOW',
        channelsSent: [],
        channelsSkipped: ['in_app', 'email'],
      };
    }

    const isAccountActivityEnabled = normalizeBoolean(
      user.notificationParameter?.isAccountActivity,
      true
    );
    const policy = resolveAccountActivityPolicy(
      input.eventType,
      isAccountActivityEnabled
    );
    const payload = buildNotificationPayload(input.eventType, input.context);

    const channelsSent: Array<'in_app' | 'email'> = [];
    const channelsSkipped: Array<'in_app' | 'email'> = [];

    if (policy.sendInApp) {
      try {
        const db = getFirestore(adminApp as any);
        await db.collection(firebaseCollectionNames.notifications).add({
          type: 'SECURITY',
          title: payload.title,
          message: payload.message,
          isRead: false,
          createdFor: uid,
          actionUrl: payload.actionUrl,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        channelsSent.push('in_app');
      } catch (error) {
        logger.error('Account activity in-app notification failed', {
          uid,
          eventType: input.eventType,
          error,
        });
        channelsSkipped.push('in_app');
      }
    } else {
      channelsSkipped.push('in_app');
    }

    if (policy.sendEmail) {
      const email = typeof user.email === 'string' ? user.email.trim() : '';
      if (EmailService.isValidEmail(email)) {
        try {
          const emailContent = buildEmailContent(payload);
          const emailSendResult = await emailService.sendEmail({
            from: EmailService.getDefaultFromAddress(),
            to: email,
            subject: emailContent.subject,
            text: emailContent.text,
            html: emailContent.html,
          });

          logger.info('Account activity email sent', {
            uid,
            eventType: input.eventType,
            email,
            simulated: emailSendResult.simulated,
            messageId: emailSendResult.messageId,
          });

          channelsSent.push('email');
        } catch (error) {
          logger.error('Account activity email failed', {
            uid,
            eventType: input.eventType,
            email,
            error,
          });
          channelsSkipped.push('email');
        }
      } else {
        channelsSkipped.push('email');
      }
    } else {
      channelsSkipped.push('email');
    }

    logger.info('Account activity dispatch completed', {
      uid,
      eventType: input.eventType,
      severity: policy.severity,
      channelsSent,
      channelsSkipped,
      reason: policy.reason,
      source: input.context?.source,
    });

    return {
      success: channelsSent.length > 0 || (!policy.sendInApp && !policy.sendEmail),
      skipped: channelsSent.length === 0,
      reason: policy.reason,
      severity: policy.severity,
      channelsSent,
      channelsSkipped,
    };
  }
}

export const accountActivityNotificationServerService: AccountActivityNotificationServerService =
  new AccountActivityNotificationServerServiceImpl();

