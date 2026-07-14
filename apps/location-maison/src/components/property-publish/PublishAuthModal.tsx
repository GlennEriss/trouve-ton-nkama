'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { InputFormApp } from '@/components/shared/form/InputFormApp'
import { PhoneNumberFormAppSimple } from '@/components/shared/form/PhoneNumberFormAppSimple'
import { DateSelect } from '@/components/shared/form/DateSelect'
import { CheckboxFormApp } from '@/components/shared/form/CheckboxFormApp'
import { FormLoginSchema, FormLoginSchemaType, FormRegisterSchema, FormRegisterSchemaType } from '@/models/schema'
import { useSignin, useSignup } from '@/features/auth/hooks'
import { useBecomeAnnouncer } from '@/features/users/become-announcer/hooks'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useToast } from '@/hooks/use-toast'
import { isAnnouncer } from '@/lib/auth/role-routing'
import { routes } from '@/constantes/routes'
import { mapRegisterFormToSignupData, mapSignupErrorToToast } from '@/features/auth/ui/v1/signup.mapper'
import { trackingEvents, useTrackEvent } from '@/features/analytics/tracking'
import { Building2, KeyRound, Loader2, Mail, User } from 'lucide-react'

type View = 'choice' | 'signup' | 'signup-pending-verification' | 'signin' | 'signin-become-announcer' | 'finalizing'

interface PublishAuthModalProps {
    isOpen: boolean
    onClose: () => void
    // Sauvegarde le brouillon en cours (texte/fichiers) avant une redirection externe complète
    // (OAuth Google, qui démonte la page) — propre à chaque appelant (annonce: localStorage +
    // IndexedDB photos ; réel: IndexedDB vidéo).
    prepareForExternalRedirect: () => void
    // Texte affiché sur la vue "choice", propre au contenu en attente de publication.
    description: string
    // Métadonnée de tracking passée à useBecomeAnnouncer, propre à l'appelant.
    becomeAnnouncerSource?: string
}

const BecomeAnnouncerSchema = z.object({
    acceptAnnouncerTerms: z.boolean().refine((v) => v === true, {
        message: "Vous devez accepter les conditions d'annonceur",
    }),
})
type BecomeAnnouncerFormType = z.infer<typeof BecomeAnnouncerSchema>

export function PublishAuthModal({
    isOpen,
    onClose,
    prepareForExternalRedirect,
    description,
    becomeAnnouncerSource,
}: PublishAuthModalProps) {
    const [view, setView] = useState<View>('choice')
    const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null)

    const { toast } = useToast()
    const { trackEvent } = useTrackEvent()
    const { user } = useCurrentUser()
    const pathname = usePathname()

    // Réinitialiser sur une nouvelle ouverture. Si l'utilisateur est déjà connecté (ex: retour
    // d'une connexion Google, ou compte "Utilisateur" existant) le guard du provider n'ouvre le
    // modal que parce qu'il manque le rôle Annonceur : on saute directement à cette étape plutôt
    // que de lui redemander de créer un compte/se connecter.
    useEffect(() => {
        if (isOpen) {
            setView(user ? 'signin-become-announcer' : 'choice')
            setPendingCredentials(null)
            trackEvent(trackingEvents.CTA_PUBLISH_AUTH_MODAL_OPEN)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    const { signup, isLoading: isSignupLoading } = useSignup()
    const { signinWithCredentials, signinWithGoogle, isCredentialsLoading, isGoogleLoading } = useSignin()
    const { becomeAnnouncer, isLoading: isBecomeAnnouncerLoading } = useBecomeAnnouncer()

    const isBusy = isSignupLoading || isCredentialsLoading || isGoogleLoading || isBecomeAnnouncerLoading

    const handleGoogleSignin = async () => {
        trackEvent(trackingEvents.CTA_PUBLISH_AUTH_CHOICE_SIGNIN, { provider: 'google' })
        // Google exige une redirection complète (pas de popup ici). On sauvegarde le brouillon
        // (texte en localStorage, photos en IndexedDB) juste avant de partir, et on ramène
        // l'utilisateur sur cette même page : tout est restauré automatiquement au retour.
        prepareForExternalRedirect()
        await signinWithGoogle({ callbackUrl: pathname })
    }

    const signupForm = useForm<FormRegisterSchemaType>({
        resolver: zodResolver(FormRegisterSchema),
        defaultValues: {
            accountType: 'Announcer',
            acceptAnnouncerTerms: false,
            firstname: '',
            lastname: '',
            email: '',
            password: '',
            passwordConfirm: '',
            birthdate: { day: '', month: '', year: '' },
            country: 'GA',
            phone: '',
            termsOfPrivacyPolicy: false,
        },
    })

    const signinForm = useForm<FormLoginSchemaType>({
        resolver: zodResolver(FormLoginSchema),
        defaultValues: { email: '', password: '' },
    })

    const becomeAnnouncerForm = useForm<BecomeAnnouncerFormType>({
        resolver: zodResolver(BecomeAnnouncerSchema),
        defaultValues: { acceptAnnouncerTerms: false },
    })

    const attemptSignin = async (credentials: { email: string; password: string }) => {
        const result = await signinWithCredentials(credentials)

        if (!result.success) {
            toast({
                duration: result.error?.duration ?? 5000,
                title: result.error?.title ?? 'Erreur de connexion',
                description: result.error?.message ?? 'Email ou mot de passe incorrect.',
                variant: 'destructive',
            })
            return
        }

        trackEvent(trackingEvents.BUSINESS_PUBLISH_AUTH_SIGNIN_SUCCESS)

        const session = await getSession()
        if (isAnnouncer(session?.user as any)) {
            setView('finalizing')
        } else {
            setView('signin-become-announcer')
        }
    }

    const handleSignupSubmit = async (values: FormRegisterSchemaType) => {
        const signupData = mapRegisterFormToSignupData(values, {
            accountType: 'Announcer',
            acceptAnnouncerTerms: true,
        })
        const result = await signup(signupData)

        if (result.success && result.userId) {
            trackEvent(trackingEvents.BUSINESS_PUBLISH_AUTH_SIGNUP_SUCCESS)
            setPendingCredentials({ email: values.email, password: values.password })
            setView('signup-pending-verification')
        } else {
            const { title, description } = mapSignupErrorToToast(result.error)
            toast({ duration: 5000, title, description, variant: 'destructive' })
        }
    }

    const handleSigninSubmit = async (values: FormLoginSchemaType) => {
        await attemptSignin(values)
    }

    const handleRetrySigninAfterVerification = async () => {
        if (!pendingCredentials) return
        await attemptSignin(pendingCredentials)
    }

    const handleBecomeAnnouncerSubmit = async (values: BecomeAnnouncerFormType) => {
        const result = await becomeAnnouncer({ acceptAnnouncerTerms: values.acceptAnnouncerTerms, source: becomeAnnouncerSource })

        if (result.success) {
            trackEvent(trackingEvents.BUSINESS_PUBLISH_AUTH_BECOME_ANNOUNCER_SUCCESS)
            setView('finalizing')
        } else {
            toast({
                duration: 5000,
                title: 'Activation impossible',
                description: result.error?.message ?? "Impossible d'activer le mode annonceur pour le moment.",
                variant: 'destructive',
            })
        }
    }

    const titleForView = (v: View): string => {
        switch (v) {
            case 'signup':
                return 'Créer un compte annonceur'
            case 'signup-pending-verification':
                return 'Vérifiez votre email'
            case 'signin':
                return 'Se connecter'
            case 'signin-become-announcer':
                return 'Activer le mode annonceur'
            case 'finalizing':
                return 'Publication en cours'
            case 'choice':
            default:
                return 'Encore une étape avant de publier'
        }
    }

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open && !isBusy) onClose()
            }}
        >
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{titleForView(view)}</DialogTitle>
                </DialogHeader>

                {view === 'choice' && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {description}
                        </p>
                        <div className="flex flex-col gap-3">
                            <Button
                                type="button"
                                className="h-12 rounded-full bg-[#1FA89B] hover:bg-[#178b80] text-white"
                                onClick={() => {
                                    trackEvent(trackingEvents.CTA_PUBLISH_AUTH_CHOICE_SIGNUP)
                                    setView('signup')
                                }}
                            >
                                <Building2 className="w-4 h-4 mr-2" />
                                Créer un compte
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-12 rounded-full border-2"
                                onClick={() => {
                                    trackEvent(trackingEvents.CTA_PUBLISH_AUTH_CHOICE_SIGNIN)
                                    setView('signin')
                                }}
                            >
                                <User className="w-4 h-4 mr-2" />
                                J&apos;ai déjà un compte
                            </Button>
                        </div>
                    </div>
                )}

                {view === 'signup' && (
                    <Form {...signupForm}>
                        <form onSubmit={signupForm.handleSubmit(handleSignupSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <InputFormApp
                                    control={signupForm.control}
                                    name="firstname"
                                    label="Prénom"
                                    IconLucide={User}
                                    IconColor="#9ca3af"
                                    placeholder="Votre prénom"
                                />
                                <InputFormApp
                                    control={signupForm.control}
                                    name="lastname"
                                    label="Nom"
                                    IconLucide={User}
                                    IconColor="#9ca3af"
                                    placeholder="Votre nom"
                                />
                            </div>
                            <InputFormApp
                                control={signupForm.control}
                                name="email"
                                label="Email"
                                type="email"
                                IconLucide={Mail}
                                IconColor="#9ca3af"
                                placeholder="vous@exemple.com"
                            />
                            <PhoneNumberFormAppSimple
                                control={signupForm.control}
                                name="phone"
                                label="Numéro de téléphone"
                                placeholder="Ex: 66 12 34 56 (sans 0)"
                            />
                            <DateSelect
                                control={signupForm.control}
                                name="birthdate"
                                label="Date de naissance"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <InputFormApp
                                    control={signupForm.control}
                                    name="password"
                                    label="Mot de passe"
                                    type="password"
                                    IconLucide={KeyRound}
                                    IconColor="#9ca3af"
                                    placeholder="Mot de passe"
                                />
                                <InputFormApp
                                    control={signupForm.control}
                                    name="passwordConfirm"
                                    label="Confirmez"
                                    type="password"
                                    IconLucide={KeyRound}
                                    IconColor="#9ca3af"
                                    placeholder="Confirmez"
                                />
                            </div>
                            <CheckboxFormApp
                                control={signupForm.control}
                                name="termsOfPrivacyPolicy"
                                label={
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        J&apos;accepte la{' '}
                                        <a href={routes.public.confidentiality} target="_blank" rel="noopener noreferrer" className="text-[#1FA89B] hover:underline font-medium">
                                            politique de confidentialité
                                        </a>{' '}
                                        et les{' '}
                                        <a href={routes.public.terms_of_use} target="_blank" rel="noopener noreferrer" className="text-[#1FA89B] hover:underline font-medium">
                                            conditions d&apos;utilisation
                                        </a>
                                    </span>
                                }
                            />
                            <CheckboxFormApp
                                control={signupForm.control}
                                name="acceptAnnouncerTerms"
                                label={
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        J&apos;accepte les{' '}
                                        <a href={routes.public.announcer_terms} target="_blank" rel="noopener noreferrer" className="text-[#1FA89B] hover:underline font-medium">
                                            conditions annonceur
                                        </a>
                                    </span>
                                }
                            />
                            <Button type="submit" disabled={isSignupLoading} className="w-full h-12 rounded-full bg-[#1FA89B] hover:bg-[#178b80] text-white">
                                {isSignupLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Créer mon compte annonceur
                            </Button>
                        </form>
                    </Form>
                )}

                {view === 'signup-pending-verification' && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Compte créé ! Un email de vérification a été envoyé à{' '}
                            <span className="font-medium">{pendingCredentials?.email}</span>. Cliquez sur le lien reçu,
                            puis revenez ici pour publier votre annonce.
                        </p>
                        <Button
                            type="button"
                            disabled={isCredentialsLoading}
                            onClick={handleRetrySigninAfterVerification}
                            className="w-full h-12 rounded-full bg-[#1FA89B] hover:bg-[#178b80] text-white"
                        >
                            {isCredentialsLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            J&apos;ai vérifié, se connecter
                        </Button>
                    </div>
                )}

                {view === 'signin' && (
                    <Form {...signinForm}>
                        <form onSubmit={signinForm.handleSubmit(handleSigninSubmit)} className="space-y-4">
                            <InputFormApp
                                control={signinForm.control}
                                name="email"
                                label="Email"
                                type="email"
                                IconLucide={Mail}
                                IconColor="#9ca3af"
                                placeholder="vous@exemple.com"
                            />
                            <InputFormApp
                                control={signinForm.control}
                                name="password"
                                label="Mot de passe"
                                type="password"
                                IconLucide={KeyRound}
                                IconColor="#9ca3af"
                                placeholder="Votre mot de passe"
                            />
                            <Button type="submit" disabled={isCredentialsLoading} className="w-full h-12 rounded-full bg-[#1FA89B] hover:bg-[#178b80] text-white">
                                {isCredentialsLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Se connecter
                            </Button>
                        </form>
                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="px-4 bg-white dark:bg-gray-900 text-sm text-gray-500">ou continuer avec</span>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleGoogleSignin}
                            disabled={isBusy}
                            className="w-full h-12 rounded-full border-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                        >
                            {isGoogleLoading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 dark:border-white" />
                            ) : (
                                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            )}
                            <span className="font-medium">Continuer avec Google</span>
                        </Button>
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            Avec Google, vous quittez momentanément cette page, mais votre annonce (textes et photos)
                            est sauvegardée et vous la retrouverez intacte à votre retour.
                        </p>
                    </Form>
                )}

                {view === 'signin-become-announcer' && (
                    <Form {...becomeAnnouncerForm}>
                        <form onSubmit={becomeAnnouncerForm.handleSubmit(handleBecomeAnnouncerSubmit)} className="space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Votre compte n&apos;est pas encore un compte annonceur. Acceptez les conditions
                                ci-dessous pour l&apos;activer et publier votre annonce.
                            </p>
                            <CheckboxFormApp
                                control={becomeAnnouncerForm.control}
                                name="acceptAnnouncerTerms"
                                label={
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        J&apos;accepte les{' '}
                                        <a href={routes.public.announcer_terms} target="_blank" rel="noopener noreferrer" className="text-[#1FA89B] hover:underline font-medium">
                                            conditions annonceur
                                        </a>
                                    </span>
                                }
                            />
                            <Button type="submit" disabled={isBecomeAnnouncerLoading} className="w-full h-12 rounded-full bg-[#1FA89B] hover:bg-[#178b80] text-white">
                                {isBecomeAnnouncerLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Activer et publier
                            </Button>
                        </form>
                    </Form>
                )}

                {view === 'finalizing' && (
                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-[#1FA89B]" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Finalisation de la connexion et publication de votre annonce...
                        </p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
