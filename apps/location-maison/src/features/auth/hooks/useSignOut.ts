'use client';

/**
 * useSignOut — déconnexion partagée (2026-08-26).
 *
 * Avant ce hook, Logout.tsx et MenuProfil.tsx dupliquaient chacun un `handleClientSignout`
 * quasi identique qui appelait `signOut()` de next-auth/react SANS OPTIONS. Sans argument,
 * `redirect` vaut true et `redirectTo` vaut `window.location.href` — l'URL courante : le clic
 * déclenchait un rechargement complet de la MÊME page, avant même que le toast de confirmation
 * ou le `router.push` vers l'accueil n'aient pu s'exécuter. Sur une route protégée (ex:
 * /profil), le rechargement retombait sur la session (déjà effacée), et le middleware
 * redirigeait vers /signin sans aucune explication — d'où le symptôme rapporté : "j'ai cliqué
 * d'innombrables fois, rien ne se passe".
 *
 * Fix : `signOut({ redirect: false })` laisse CE hook piloter explicitement la navigation
 * (toast + router.push), comme le faisait déjà — sans jamais être branché à aucun bouton —
 * l'ancienne server action src/actions/signout.ts.
 */

import { useCallback, useState } from 'react';
import { signOut as nextAuthSignOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { routes } from '@/constantes/routes';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth.use-sign-out');

const getFirebaseAuth = () => import('@/firebase/auth');

export interface UseSignOutReturn {
  signOut: () => Promise<void>;
  isSigningOut: boolean;
}

export function useSignOut(redirectTo: string = routes.public.homePage): UseSignOutReturn {
  const router = useRouter();
  const { toast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    // Garde-fou anti double-clic : un rage-click répété (exactement ce que l'utilisateur a
    // fait) ne doit pas empiler plusieurs appels concurrents.
    if (isSigningOut) {
      return;
    }
    setIsSigningOut(true);

    // Best-effort : la session Firebase client n'existe même pas pour tous les providers
    // (ex: Google — voir complete-profile.service.ts) et n'est pas la source de vérité pour
    // l'accès à l'app (NextAuth l'est). Un échec ici ne doit jamais bloquer la vraie
    // déconnexion.
    try {
      const { auth, signOut: firebaseSignOut } = await getFirebaseAuth();
      await firebaseSignOut(auth);
    } catch (error) {
      logger.warn('Firebase client sign-out failed (non-blocking)', { error });
    }

    try {
      await nextAuthSignOut({ redirect: false });
      toast({
        duration: 5000,
        title: 'Déconnexion',
        description: 'Vous vous êtes déconnectés de la plateforme',
        variant: 'warning',
      });
      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      logger.error('Sign-out failed', { error });
      toast({
        duration: 5000,
        title: 'Erreur de déconnexion',
        description: 'Une erreur est survenue lors de la déconnexion. Réessayez.',
        variant: 'destructive',
      });
    } finally {
      setIsSigningOut(false);
    }
  }, [isSigningOut, redirectTo, router, toast]);

  return { signOut, isSigningOut };
}
