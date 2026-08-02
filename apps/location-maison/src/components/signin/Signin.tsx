'use client'
import React from 'react'
import { LayoutAuth } from '../layouts/LayoutAuth'
import { zodResolver } from '@hookform/resolvers/zod';
import { FormLoginSchema, FormLoginSchemaType } from '@/models/schema';
import { useForm } from 'react-hook-form';
import { Form } from '../ui/form';
import { InputForm } from '../forms/InputForm';
import Link from 'next/link';
import { ButtonLoading } from '../buttons/ButtonLoading';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { signIn } from "next-auth/react"
import { routes } from '@/constantes/routes';
import { createLogger } from '@/lib/logger';

const logger = createLogger('components.signin');

export const Signin = () => {
    const router = useRouter()
    const searchParams = useSearchParams();
    const [isOtherMethodConnection, setIsOtherMethodConnection] = React.useState(false)
    const { toast } = useToast()
    const form = useForm<FormLoginSchemaType>({
        resolver: zodResolver(FormLoginSchema)
    })
    const onSubmit = async (values: FormLoginSchemaType) => {
        const validateFields = FormLoginSchema.safeParse(values)
        if (!validateFields.success) {
            return toast({
                duration: 5000,
                title: 'Erreur de connexion',
                description: "Email ou mot de passe incorrect!",
                variant: 'destructive',
            });
        }
        const user = {
            login: validateFields.data.email,
            password: validateFields.data.password
        }
        try {
            const result = await signIn('credentials', {
                ...user,
                redirect: false
            })
            if (!result?.ok || result?.error !== null) {
                // Gestion spécifique des erreurs Firebase Auth
                let errorMessage = "Email ou mot de passe incorrect!";
                let errorTitle = "Erreur de connexion";
                let duration = 5000;
                
                switch (result?.error) {
                    case 'Email is not verified':
                        errorMessage = "Veuillez vérifier votre email avant de vous connecter. Vérifiez votre boîte de réception et cliquez sur le lien de vérification.";
                        errorTitle = "Email non vérifié";
                        duration = 7000;
                        break;
                    case 'auth/user-not-found':
                        errorMessage = "Aucun compte associé à cette adresse email.";
                        errorTitle = "Compte non trouvé";
                        break;
                    case 'auth/wrong-password':
                        errorMessage = "Mot de passe incorrect.";
                        errorTitle = "Mot de passe incorrect";
                        break;
                    case 'auth/invalid-email':
                        errorMessage = "Format d'email invalide.";
                        errorTitle = "Email invalide";
                        break;
                    case 'auth/user-disabled':
                        errorMessage = "Ce compte a été désactivé. Veuillez contacter le support.";
                        errorTitle = "Compte désactivé";
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = "Trop de tentatives de connexion. Veuillez attendre quelques minutes avant de réessayer.";
                        errorTitle = "Trop de tentatives";
                        duration = 8000;
                        break;
                    case 'auth/network-request-failed':
                        errorMessage = "Erreur de connexion réseau. Vérifiez votre connexion internet.";
                        errorTitle = "Erreur réseau";
                        break;
                    default:
                        // Message générique pour les autres erreurs
                        errorMessage = "Email ou mot de passe incorrect!";
                        errorTitle = "Erreur de connexion";
                }
                
                return toast({
                    duration,
                    title: errorTitle,
                    description: errorMessage,
                    variant: 'destructive',
                });
            }
            toast({
                duration: 5000,
                title: 'Connexion réussie',
                description: "Vous vous êtes connectés avec succès!",
                variant: 'success',
            });
            return router.push(routes.protected.properties)
        } catch (error) {
            logger.error('Authentication error', { error });
            return toast({
                duration: 5000,
                title: 'Erreur de connexion',
                description: "Email ou mot de passe incorrect!",
                variant: 'destructive',
            });
        }
    }
    React.useEffect(() => {
        const error = searchParams.get("error");
        if (error === "wrong_provider") {
            toast({
                duration: 5000,
                title: "Erreur de connexion",
                description: "Ce compte est associé à un autre mode de connexion. Connectez-vous d'abord avec votre méthode habituelle, puis liez Google dans « Login & Security ».",
                variant: "destructive",
            });
        } else if (error === "google_provider_disabled") {
            toast({
                duration: 7000,
                title: "Google indisponible",
                description: "La connexion Google n'est pas activée sur cet environnement. Active le provider Google dans Firebase Auth > Sign-in method.",
                variant: "destructive",
            });
        } else if (error === "google_signin_failed") {
            toast({
                duration: 5000,
                title: "Connexion Google échouée",
                description: "Impossible de finaliser la connexion Google pour le moment. Réessayez ou utilisez email/mot de passe.",
                variant: "destructive",
            });
        }
    }, [searchParams, toast]);
    return (
        <LayoutAuth
            type='Signin'
            setIsOtherMethodConnection={setIsOtherMethodConnection}
        >
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                    <h1 className="text-lg">Heureux de vous revoir, connectez-vous</h1>
                    <InputForm
                        form={form as any}
                        name='email'
                        label='Email'
                        type='email'
                        placeholder='johndoe@mail.test'
                        className='p-5'
                    />
                    <InputForm
                        form={form as any}
                        name='password'
                        label='Mot de passe'
                        type='password'
                        placeholder='*******'
                        className='p-5'
                    />
                    <Link href={routes.public.passwordResetRequest} className='text-red-500 flex justify-end text-sm'>
                        Mot de passe oublié?
                    </Link>
                    <ButtonLoading
                        type='submit'
                        disabled={Boolean(form.formState.isSubmitting) || Boolean(form.formState.isLoading) || Boolean(isOtherMethodConnection)}
                        className='w-full bg-gradient-to-r from-primary via-secondary to-primary'>
                        Se connecter
                    </ButtonLoading>
                </form>
            </Form>
        </LayoutAuth>
    )
}
