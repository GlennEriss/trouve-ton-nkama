import type {
  AccountActivityEventType,
  AccountActivityPolicyDecision,
  AccountActivitySeverity,
} from './account-activity-notification.service.interface';

const CRITICAL_EVENTS = new Set<AccountActivityEventType>([
  'ACCOUNT_PASSWORD_CHANGED',
  'ACCOUNT_EMAIL_CHANGED',
  'ACCOUNT_PROVIDER_LINKED',
  'ACCOUNT_PROVIDER_UNLINKED',
]);

const MEDIUM_EVENTS = new Set<AccountActivityEventType>([
  'ACCOUNT_PHONE_CHANGED',
  'ACCOUNT_PHONE_VERIFIED',
]);

function resolveSeverity(eventType: AccountActivityEventType): AccountActivitySeverity {
  if (CRITICAL_EVENTS.has(eventType)) {
    return 'CRITICAL';
  }
  if (MEDIUM_EVENTS.has(eventType)) {
    return 'MEDIUM';
  }
  return 'LOW';
}

export function resolveAccountActivityPolicy(
  eventType: AccountActivityEventType,
  isAccountActivityEnabled: boolean
): AccountActivityPolicyDecision {
  const severity = resolveSeverity(eventType);

  if (severity === 'CRITICAL') {
    return {
      severity,
      sendInApp: true,
      sendEmail: true,
    };
  }

  if (!isAccountActivityEnabled) {
    return {
      severity,
      sendInApp: false,
      sendEmail: false,
      reason: 'account_activity_disabled',
    };
  }

  return {
    severity,
    sendInApp: true,
    sendEmail: false,
  };
}

