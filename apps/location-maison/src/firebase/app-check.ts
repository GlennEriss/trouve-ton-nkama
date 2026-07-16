import type { FirebaseApp } from 'firebase/app';
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  ReCaptchaV3Provider,
  type AppCheck,
  type AppCheckOptions,
} from 'firebase/app-check';
import { createLogger } from '@/lib/logger';

const logger = createLogger('firebase.app-check');

let appCheckInstance: AppCheck | null = null;

function getGlobalAppCheckDebugTarget() {
  return globalThis as typeof globalThis & {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
  };
}

function isLocalDevelopmentHost(): boolean {
  if (typeof window === 'undefined') return false;

  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

function resolveEnvValue(...values: Array<string | undefined>): string {
  return values.map((value) => value?.trim()).find(Boolean) ?? '';
}

function enableAppCheckDebugModeIfNeeded(): void {
  if (typeof window === 'undefined') return;

  const configuredDebugToken = resolveEnvValue(
    process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN
  );
  const shouldUseDebugProvider =
    Boolean(configuredDebugToken) ||
    (process.env.NODE_ENV !== 'production' && isLocalDevelopmentHost());

  if (!shouldUseDebugProvider) return;

  getGlobalAppCheckDebugTarget().FIREBASE_APPCHECK_DEBUG_TOKEN = configuredDebugToken || true;
}

function buildAppCheckProvider(): AppCheckOptions['provider'] | null {
  const enterpriseSiteKey = resolveEnvValue(
    process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY
  );

  if (enterpriseSiteKey) {
    return new ReCaptchaEnterpriseProvider(enterpriseSiteKey);
  }

  const recaptchaV3SiteKey = resolveEnvValue(
    process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_RECAPTCHA_SITE_KEY,
    process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY
  );

  if (!recaptchaV3SiteKey) {
    return null;
  }

  return new ReCaptchaV3Provider(recaptchaV3SiteKey);
}

export function setupFirebaseAppCheck(app: FirebaseApp): AppCheck | null {
  if (typeof window === 'undefined') return null;
  if (appCheckInstance) return appCheckInstance;

  enableAppCheckDebugModeIfNeeded();

  const provider = buildAppCheckProvider();
  if (!provider) {
    logger.warn('Firebase App Check not initialized: missing reCAPTCHA site key');
    return null;
  }

  try {
    appCheckInstance = initializeAppCheck(app, {
      provider,
      isTokenAutoRefreshEnabled: true,
    });

    return appCheckInstance;
  } catch (error) {
    logger.warn('Firebase App Check initialization skipped', { error });
    return null;
  }
}
