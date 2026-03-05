import { routes } from '@/constantes/routes';
import { auth, GoogleAuthProvider } from '@/firebase/auth';
import { createLogger } from '@/lib/logger';
import type { Role, User } from '@/models/authentication';
import { userRepository } from '../repositories/user.repository';
import {
  FacebookAuthProvider,
  linkWithCredential,
  signInWithCredential,
} from 'firebase/auth';

type ProviderType = 'GOOGLE' | 'FACEBOOK' | 'CREDENTIALS';

type ExistingUser = {
  uid: string;
  email?: string | null;
  providers?: ProviderType[];
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

type OAuthUser = {
  email?: string | null;
};

type OAuthAccount = {
  id_token?: string | null;
};

type OAuthProfile = {
  picture?: string;
};

const logger = createLogger('auth.oauth-google-service');

const GOOGLE_USER_DEFAULT_ROLES: Role[] = ['User'];

function createDefaultNotificationParameter() {
  return {
    isNew: true,
    isAccountActivity: true,
    isNewAnnouncement: true,
    isFavoris: true,
    isPersonalizedSuggestions: true,
    isSystemUpdated: true,
  };
}

function normalizeProviders(providers: unknown): ProviderType[] {
  if (!Array.isArray(providers)) {
    return [];
  }

  return providers.filter((provider): provider is ProviderType =>
    provider === 'GOOGLE' || provider === 'FACEBOOK' || provider === 'CREDENTIALS'
  );
}

export function validateCredentialsUserForOAuth(
  userExists: ExistingUser | null,
  credentials: unknown
): true | string | null {
  if (!userExists) {
    return null;
  }

  const providers = normalizeProviders(userExists.providers);
  const hasOnlyCredentials =
    providers.includes('CREDENTIALS') &&
    !providers.includes('FACEBOOK') &&
    !providers.includes('GOOGLE');

  if (!hasOnlyCredentials) {
    return null;
  }

  return credentials ? true : `${routes.public.signin}?error=wrong_provider`;
}

async function handleNewGoogleUser(
  user: OAuthUser,
  account: OAuthAccount,
  profile: OAuthProfile,
  credential: ReturnType<typeof GoogleAuthProvider.credential>
): Promise<string> {
  const firebaseUser = await signInWithCredential(auth, credential);
  const uid = firebaseUser.user.uid;
  const email = user?.email ?? '';

  // New Google accounts are created as User and complete their profile afterward.
  await userRepository.create({
    uid,
    login: email,
    firstname: '',
    lastname: '',
    email,
    image: profile?.picture ?? '',
    phoneNumbers: [],
    phoneNumberVerified: false,
    birthDate: '',
    roles: GOOGLE_USER_DEFAULT_ROLES,
    searchableName: '',
    providers: ['GOOGLE'],
    metadata: {
      idToken: account.id_token,
      needsProfileCompletion: true,
    },
    notificationParameter: createDefaultNotificationParameter(),
    favoris: [],
    credits: 3,
    state: 'IN_PROGRESS',
  } as User);

  return routes.public.completeProfile;
}

async function handleExistingGoogleUser(
  userExists: ExistingUser,
  account: OAuthAccount,
  credential: ReturnType<typeof GoogleAuthProvider.credential>
): Promise<void> {
  const providers = normalizeProviders(userExists.providers);
  const metadata = (userExists.metadata ?? {}) as Record<string, unknown>;
  const needsGoogleLinking = !providers.includes('GOOGLE');

  if (needsGoogleLinking) {
    const facebookAccessToken = metadata.accessToken;

    if (typeof facebookAccessToken === 'string' && facebookAccessToken.length > 0) {
      const facebookCredential = FacebookAuthProvider.credential(facebookAccessToken);
      const facebookUser = await signInWithCredential(auth, facebookCredential);
      await linkWithCredential(facebookUser.user, credential);
    }

    providers.push('GOOGLE');
  }

  await userRepository.update(userExists.uid, {
    ...(userExists as object),
    metadata: {
      ...metadata,
      idToken: account.id_token,
    },
    providers,
  } as Partial<User>);
}

export async function handleGoogleSignIn(
  user: OAuthUser,
  account: OAuthAccount,
  profile: OAuthProfile,
  userExists: ExistingUser | null
): Promise<boolean | string> {
  const credential = GoogleAuthProvider.credential(account?.id_token ?? undefined);

  if (!credential) {
    logger.warn('Google OAuth credential is missing');
    return false;
  }

  try {
    if (!userExists) {
      return await handleNewGoogleUser(user, account, profile, credential);
    }

    await handleExistingGoogleUser(userExists, account, credential);
    return true;
  } catch (error: any) {
    const code = error?.code as string | undefined;
    logger.error('Google sign-in flow failed', {
      email: user?.email,
      userExists: Boolean(userExists),
      code,
      error,
    });

    // Firebase provider is disabled for this environment/project.
    if (code === 'auth/operation-not-allowed') {
      return `${routes.public.signin}?error=google_provider_disabled`;
    }

    // Avoid raw AccessDenied page by redirecting to signin with an actionable code.
    return `${routes.public.signin}?error=google_signin_failed`;
  }
}
