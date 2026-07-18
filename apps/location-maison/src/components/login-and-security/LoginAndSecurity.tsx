'use client'
import React, { useState } from 'react'
import { Separator } from '@/components/ui/separator';
import connectionMethods from '@/constantes/connections-methods';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { routes } from '@/constantes/routes';
import { signInWithGoogle } from '@/actions/signin-with-google';
import { useCurrentUser } from '@/hooks/use-current-user';
import { ProviderType, User as UserModel } from '@/models/authentication';
import { signInWithFacebook } from '@/actions/signin-with-facebook';
import PasswordModal from '@/components/login-and-security/PasswordModal';
import { updateUser } from '@/db/user.db';
import { EmailAuthCredential, EmailAuthProvider, FacebookAuthProvider, GoogleAuthProvider, linkWithPopup, signInWithCredential } from 'firebase/auth';
import { auth } from '@/firebase/auth';
import { useSession } from 'next-auth/react';
import { dispatchAccountActivityFromClient } from '@/features/users/account-activity-notifications/services/account-activity.client.service';
import { createLogger } from '@/lib/logger';

const logger = createLogger('users.login-and-security');

export default function LoginAndSecurity() {
    const { user } = useCurrentUser();
    const { update } = useSession();
    const [isPending, startTransition] = React.useTransition();

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [pendingProvider, setPendingProvider] = useState<'GOOGLE' | 'FACEBOOK' | null>(null);
    const [email, setEmail] = useState("");

    const handleConnection = (method: 'GOOGLE' | 'FACEBOOK') => {
        if (user?.providers?.includes('CREDENTIALS')) {
            setPendingProvider(method);
            setEmail(user.email ?? "");
            setShowPasswordModal(true);
        } else {
            startTransition(() => {
                if (method === 'GOOGLE') {
                    signInWithGoogle();
                } else {
                    signInWithFacebook();
                }
            });
        }
    };

    const onPasswordConfirm = async (password: string) => {
        setShowPasswordModal(false);
        if (!user) {
            setShowPasswordModal(true);
            return;
        }
        if (pendingProvider === 'GOOGLE') {
            try {
                const googleProvider = new GoogleAuthProvider();
                const emailAuthCred: EmailAuthCredential = EmailAuthProvider.credential(email, password);

                // Authentifier l'utilisateur avec son email/mot de passe
                const userCredential = await signInWithCredential(auth, emailAuthCred);
                const firebaseUserCred = userCredential.user;

                // Lier le compte Google
                const result = await linkWithPopup(firebaseUserCred, googleProvider);
                const googleCredential = GoogleAuthProvider.credentialFromResult(result);
                const userUpdated: Partial<UserModel> = {
                    ...user,
                    metadata: { ...user.metadata, idToken: googleCredential?.idToken },
                    providers: [...user.providers, 'GOOGLE']
                }
                await updateUser(user.uid, userUpdated);
                await update({
                    user: {
                        ...userUpdated
                    }
                });

                dispatchAccountActivityFromClient({
                    eventType: 'ACCOUNT_PROVIDER_LINKED',
                    eventId: `provider-linked:${user.uid}:GOOGLE:${Date.now()}`,
                    context: {
                        provider: 'GOOGLE',
                        source: 'login-and-security',
                        actionUrl: '/login-and-security',
                    },
                }).catch((error) => {
                    logger.warn('Account activity dispatch failed after Google provider link', {
                        uid: user.uid,
                        error,
                    });
                });
            } catch (error) {
                logger.error('Google provider linking failed', {
                    uid: user.uid,
                    error,
                });
            }
        } else if (pendingProvider === 'FACEBOOK') {
            try {
                const facebookProvider = new FacebookAuthProvider();
                const emailAuthCred: EmailAuthCredential = EmailAuthProvider.credential(email, password);
                const userCredential = await signInWithCredential(auth, emailAuthCred);
                const firebaseUserCred = userCredential.user;
                const result = await linkWithPopup(firebaseUserCred, facebookProvider);
                const facebookCredential = FacebookAuthProvider.credentialFromResult(result);
                const userUpdated: Partial<UserModel> = {
                    ...user,
                    metadata: { ...user.metadata, accessToken: facebookCredential?.accessToken },
                    providers: [...user.providers, 'FACEBOOK']
                }
                await updateUser(user.uid, userUpdated);
                await update({
                    user: {
                        ...userUpdated
                    }
                });

                dispatchAccountActivityFromClient({
                    eventType: 'ACCOUNT_PROVIDER_LINKED',
                    eventId: `provider-linked:${user.uid}:FACEBOOK:${Date.now()}`,
                    context: {
                        provider: 'FACEBOOK',
                        source: 'login-and-security',
                        actionUrl: '/login-and-security',
                    },
                }).catch((error) => {
                    logger.warn('Account activity dispatch failed after Facebook provider link', {
                        uid: user.uid,
                        error,
                    });
                });
            } catch (error) {
                logger.error('Facebook provider linking failed', {
                    uid: user.uid,
                    error,
                });
            }
        }
    };

    return (
        <div className='mx-auto max-w-4xl px-6 text-gray-900 dark:text-white'>
            <h2 className='text-xl font-bold'>Méthodes de connexion</h2>
            <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
                Associez une méthode supplémentaire pour accéder plus facilement à votre compte.
            </p>
            <Separator className='my-4' />
            <div>
                {connectionMethods.map((connection) => (
                    <div key={connection.method} className=''>
                        <div className='grid grid-cols-[auto_1fr] items-center gap-3 sm:grid-cols-[auto_1fr_auto]'>
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                                <connection.icon size={24} />
                            </div>
                            <div className='min-w-0'>
                                <p className='font-semibold capitalize'>{connection.method.toLowerCase()}</p>
                                {user?.providers?.includes(connection.method as ProviderType) ? (
                                    <span className='text-sm font-semibold text-emerald-700 dark:text-emerald-300'>Connecté</span>
                                ) : (
                                    <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>Non connecté</span>
                                )}
                            </div>
                            <Button
                                type='button'
                                variant='outline'
                                className='col-span-2 h-11 w-full rounded-full sm:col-span-1 sm:w-auto'
                                onClick={() => handleConnection(connection.method)}
                                disabled={Boolean(user?.providers?.includes(connection.method as ProviderType)) || Boolean(isPending)}
                            >
                                {user?.providers?.includes(connection.method as ProviderType) ? 'Déjà associé' : 'Associer'}
                            </Button>
                        </div>
                        <Separator className='my-4' />
                    </div>
                ))}
            </div>
            <div className='space-y-2'>
                <h2 className='text-xl font-bold'>Mot de passe</h2>
                <p className='text-sm text-gray-600 dark:text-gray-400'>Renouvelez votre mot de passe en cas de doute ou par précaution.</p>
                <Button variant='outline' className='h-11 rounded-full' asChild disabled={isPending}>
                    <Link href={routes.public.reset_password}>
                        Mettre à jour
                    </Link>
                </Button>
            </div>

            {/* Modale pour saisir le mot de passe */}
            <PasswordModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                onConfirm={onPasswordConfirm}
            />
        </div>
    );
}
