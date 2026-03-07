export type AccountActivityEventType =
  | 'ACCOUNT_PASSWORD_CHANGED'
  | 'ACCOUNT_EMAIL_CHANGED'
  | 'ACCOUNT_PROVIDER_LINKED'
  | 'ACCOUNT_PROVIDER_UNLINKED'
  | 'ACCOUNT_PHONE_CHANGED'
  | 'ACCOUNT_PHONE_VERIFIED'
  | 'ACCOUNT_PROFILE_UPDATED';

export type AccountActivitySeverity = 'CRITICAL' | 'MEDIUM' | 'LOW';

export type AccountActivityEventContext = {
  provider?: 'GOOGLE' | 'FACEBOOK' | 'CREDENTIALS';
  changedFields?: string[];
  source?: string;
  actionUrl?: string;
  [key: string]: unknown;
};

export type DispatchAccountActivityInput = {
  uid: string;
  eventType: AccountActivityEventType;
  eventId?: string;
  context?: AccountActivityEventContext;
};

export type AccountActivityDispatchChannel = 'in_app' | 'email';

export type AccountActivityDispatchResult = {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  severity: AccountActivitySeverity;
  channelsSent: AccountActivityDispatchChannel[];
  channelsSkipped: AccountActivityDispatchChannel[];
};

export type AccountActivityPolicyDecision = {
  severity: AccountActivitySeverity;
  sendInApp: boolean;
  sendEmail: boolean;
  reason?: string;
};

export interface AccountActivityNotificationServerService {
  dispatch(input: DispatchAccountActivityInput): Promise<AccountActivityDispatchResult>;
}

