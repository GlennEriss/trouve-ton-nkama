import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { app } from './app';

let analyticsPromise: Promise<Analytics | null> | null = null;

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) {
    return null;
  }

  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => (supported ? getAnalytics(app) : null))
      .catch(() => null);
  }

  return analyticsPromise;
}

export {
  logEvent,
  setUserId,
  setUserProperties,
  setAnalyticsCollectionEnabled,
} from 'firebase/analytics';
