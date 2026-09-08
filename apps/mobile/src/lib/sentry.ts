import * as Sentry from '@sentry/react-native';

// DSN volontairement vide tant qu'un vrai projet Sentry n'a pas été créé (compte à part,
// je ne peux pas en provisionner un moi-même) — Sentry.init() avec un DSN vide ne plante pas,
// il logue juste un avertissement et n'envoie rien. Remplacer EXPO_PUBLIC_SENTRY_DSN dans
// .env une fois le projet créé sur sentry.io, aucun autre changement de code nécessaire.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

export function initSentry() {
  if (!SENTRY_DSN) {
    if (__DEV__) {
      console.warn('[Sentry] EXPO_PUBLIC_SENTRY_DSN absent — crash reporting désactivé.');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    debug: __DEV__,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  });
}

export { Sentry };
