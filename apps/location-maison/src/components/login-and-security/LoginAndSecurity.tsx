'use client'
import React, { useState } from 'react'
import { Separator } from '@/components/ui/separator';
import connectionMethods from '@/constantes/connections-methods';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { routes } from '@/constantes/routes';
import { signInWithGoogle } from '@/actions/signin-with-google';
import { useCurrentUser } from '@/hooks/use-current-user';
import { ProviderType } from '@/models/authentication';
import { signInWithFacebook } from '@/actions/signin-with-facebook';
import PasswordModal from '@/components/login-and-security/PasswordModal';
import { updateUser } from '@/db/user.db';
import { EmailAuthCredential, EmailAuthProvider, FacebookAuthProvider, fetchSignInMethodsForEmail, GoogleAuthProvider, linkWithCredential, linkWithPopup, signInWithCredential, signInWithPopup, User } from 'firebase/auth';
import { auth } from '@/firebase/auth';
import { createNotification } from '@/db/notification.db';
import { useSession } from 'next-auth/react';
import { User as UserModel } from '@/models/authentication'

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
            const googleProvider = new GoogleAuthProvider();
            const emailAuthCred: EmailAuthCredential = EmailAuthProvider.credential(email, password);

            // 🔹 Authentifier l'utilisateur avec son email/mot de passe
            const userCredential = await signInWithCredential(auth, emailAuthCred);
            const firebaseUserCred = userCredential.user;

            // 🔹 Lier le compte Google
            linkWithPopup(firebaseUserCred, googleProvider)
                .then(async (result) => {
                    const googleCredential = GoogleAuthProvider.credentialFromResult(result);
                    const userUpdated: Partial<UserModel> = {
                        ...user,
                        metadata: { ...user.metadata, idToken: googleCredential?.idToken },
                        providers: [...user.providers, 'GOOGLE']
                    }
                    await updateUser(user.uid, userUpdated);
                    update({
                        user: {
                            ...userUpdated
                        }
                    });
                })
                .catch((error) => {
                    console.error("Erreur lors de la liaison avec Google :", error);
                });
            await createNotification({
                type: 'SECURITY',
                title: 'Sécurité avec Google',
                message: "Votre compte a été sécurisé avec Google",
                isRead: false,
                createdFor: user.uid,
                actionUrl: routes.protected.login_and_security,
            });
        } else if (pendingProvider === 'FACEBOOK') {
            const facebookProvider = new FacebookAuthProvider();
            const emailAuthCred: EmailAuthCredential = EmailAuthProvider.credential(email, password);
            const userCredential = await signInWithCredential(auth, emailAuthCred);
            const firebaseUserCred = userCredential.user;
            linkWithPopup(firebaseUserCred, facebookProvider)
                .then(async (result) => {
                    const facebookCredential = FacebookAuthProvider.credentialFromResult(result);
                    const userUpdated: Partial<UserModel> = {
                        ...user,
                        metadata: { ...user.metadata, accessToken: facebookCredential?.accessToken },
                        providers: [...user.providers, 'FACEBOOK']
                    }
                    await updateUser(user.uid, userUpdated);
                    update({
                        user: {
                            ...userUpdated
                        }
                    });
                })
            await createNotification({
                type: 'SECURITY',
                title: 'Sécurité avec Facebook',
                message: "Votre compte a été sécurisé avec Facebook",
                isRead: false,
                createdFor: user.uid,
                actionUrl: routes.protected.login_and_security,
            });
        }
    };

    return (
        <div className='px-6'>
            <h1 className='text-xl font-bold'>Réseaux sociaux</h1>
            <Separator className='my-4' />
            <div>
                {connectionMethods.map((connection, key) => (
                    <div key={key} className=''>
                        <div className='flex items-center justify-between'>
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition duration-200">
                                <connection.icon size={24} />
                            </div>
                            <div>
                                {user?.providers?.includes(connection.method as ProviderType) ? (
                                    <span className='text-green-500 font-bold'>Connecté</span>
                                ) : (
                                    <span className='text-red-500 font-bold'>Non connecté</span>
                                )}
                            </div>
                            <Button
                                type='button'
                                onClick={() => handleConnection(connection.method)}
                                disabled={user?.providers?.includes(connection.method as ProviderType)}
                            >
                                Se connecter
                            </Button>
                        </div>
                        <Separator className='my-4' />
                    </div>
                ))}
            </div>
            <div className='space-y-2'>
                <h1 className='text-xl font-bold'>Modifier le mot de passe</h1>
                <Button variant='outline' asChild>
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