'use client'
import { routes } from '@/constantes/routes'
import { useToast } from '@/hooks/use-toast'
import { createLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { FormRegisterSchema, FormRegisterSchemaType } from '@/models/schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, ChevronLeft, CircleUser, KeyRound, Mail } from 'lucide-react'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React from 'react'
import { useForm } from 'react-hook-form'
import { Form } from '../ui/form'
import { InputFormApp } from '../shared/form/InputFormApp'
import { ButtonApp } from '../shared/ui/ButtonApp'
import { signIn } from 'next-auth/react'
import { Button } from '../ui/button'
import { PhoneNumberFormApp } from '../shared/form/PhoneNumberFormApp'
import { CheckboxFormApp } from '../shared/form/CheckboxFormApp'
import { DateSelect } from '../shared/form/DateSelect'
import { useSignup } from '@/features/auth/hooks'
import { mapRegisterFormToSignupData } from '@/features/auth/ui/v1/signup.mapper'

const inter = Inter({
    subsets: ['latin'],
    weight: ['400'],
})

const logger = createLogger('auth.signup-mobile')

export const SignupMobileComponent = () => {
    const router = useRouter()
    const { toast } = useToast()
    const [isOtherMethodConnection, setIsOtherMethodConnection] = React.useState(false)
    const { signup, isLoading } = useSignup()
    
    const form = useForm<FormRegisterSchemaType>({
        resolver: zodResolver(FormRegisterSchema),
        mode: 'onChange', // Validation en temps réel
        defaultValues: {
            accountType: 'User',
            acceptAnnouncerTerms: false,
            firstname: '',
            lastname: '',
            email: '',
            password: '',
            passwordConfirm: '',
            birthdate: {
                day: '',
                month: '',
                year: ''
            },
            phone: '',
            country: 'GA',
            termsOfPrivacyPolicy: false
        }
    })
    const selectedAccountType = form.watch('accountType') || 'User'
    
    const handleSigninWithGoogle = async () => {
        setIsOtherMethodConnection(true)
        try {
            await signIn('google')
        } catch (error) {
            logger.error('Google sign-in failed from mobile signup', { error })
        } finally {
            setIsOtherMethodConnection(false)
        }
    }

    const onSubmit = async (values: FormRegisterSchemaType) => {
        try {
            const signupData = mapRegisterFormToSignupData(values)
            const result = await signup(signupData)
            
            if (result.success && result.userId) {
                toast({
                    duration: 5000,
                    title: 'Création de compte',
                    description: "Votre compte a été créé avec succès!",
                    variant: 'success',
                });
                router.push('/signup/success?uid=' + result.userId)
            } else {
                const code = result.error?.code
                let errorMessage = result.error?.message || "Une erreur est survenue lors de la création du compte."
                let errorTitle = "Création de compte"

                if (code === 'EMAIL_ALREADY_IN_USE') {
                    errorMessage = "Cette adresse email est déjà utilisée par un autre compte."
                    errorTitle = "Email déjà utilisé"
                } else if (code === 'INVALID_EMAIL') {
                    errorMessage = "L'adresse email fournie n'est pas valide."
                    errorTitle = "Email invalide"
                } else if (code === 'WEAK_PASSWORD') {
                    errorMessage = "Le mot de passe est trop faible. Il doit contenir au moins 8 caractères."
                    errorTitle = "Mot de passe faible"
                } else if (code === 'PHONE_ALREADY_IN_USE') {
                    errorMessage = "Ce numéro de téléphone est déjà associé à un compte."
                    errorTitle = "Numéro déjà utilisé"
                } else if (code === 'TERMS_NOT_ACCEPTED') {
                    errorMessage = "Vous devez accepter les conditions pour créer un compte."
                    errorTitle = "Conditions non acceptées"
                } else if (code === 'ANNOUNCER_TERMS_NOT_ACCEPTED') {
                    errorMessage = "Vous devez accepter les conditions annonceur pour créer un compte annonceur."
                    errorTitle = "Conditions annonceur non acceptées"
                }

                toast({
                    duration: 5000,
                    title: errorTitle,
                    description: errorMessage,
                    variant: 'destructive',
                });
            }
        } catch (error) {
            logger.error('Unexpected error during mobile signup', { error })
            toast({
                duration: 5000,
                title: "Erreur",
                description: "Une erreur inattendue s'est produite.",
                variant: 'destructive',
            })
        } finally {
            // no-op: state handled by useSignup + RHF
        }
    }
    
    const isFormLoading = isLoading || form.formState.isSubmitting
    const isGoogleLoading = isOtherMethodConnection
    
    return (
        <div className={cn('p-4 md:p-20', inter.className)}>
            <div>
                <Link href={routes.public.signin}>
                    <ChevronLeft color='gray' size={30} />
                </Link>
            </div>

            <section className='mt-8 md:mt-10'>
                <h1 className='text-2xl font-bold text-[#187872]'>Explorons ensemble avec Trouve Ton Nkama !</h1>
                <p className='text-gray-500'>
                    Créez votre compte Trouve Ton Nkama pour trouver votre logement de rêve partout au Gabon !
                </p>
            </section>
            <Form {...form}>
                <section className='mt-8 md:mt-10'>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Type de compte</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        form.setValue('accountType', 'User', {
                                            shouldDirty: true,
                                            shouldValidate: true,
                                        })
                                    }
                                    className={`rounded-xl border p-3 text-left ${
                                        selectedAccountType === 'User'
                                            ? 'border-[#1FA89B] bg-teal-50'
                                            : 'border-gray-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 font-semibold text-sm">
                                        <CircleUser size={16} />
                                        Utilisateur
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Chercher un logement</p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        form.setValue('accountType', 'Announcer', {
                                            shouldDirty: true,
                                            shouldValidate: true,
                                        })
                                    }
                                    className={`rounded-xl border p-3 text-left ${
                                        selectedAccountType === 'Announcer'
                                            ? 'border-[#1FA89B] bg-teal-50'
                                            : 'border-gray-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 font-semibold text-sm">
                                        <Building2 size={16} />
                                        Annonceur
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Publier des annonces</p>
                                </button>
                            </div>
                        </div>
                        <InputFormApp
                            control={form.control}
                            name='firstname'
                            label='Nom'
                            type='text'
                            IconLucide={CircleUser}
                            IconColorFill={'none'}
                            IconColor='gray'
                            placeholder='Saisissez votre nom'
                        />
                        <InputFormApp
                            control={form.control}
                            name='lastname'
                            label='Prénom'
                            type='text'
                            IconLucide={CircleUser}
                            IconColorFill={'none'}
                            IconColor='gray'
                            placeholder='Saisissez votre prénom'
                        />
                        <InputFormApp
                            control={form.control}
                            name='email'
                            label='Email'
                            type='email'
                            IconLucide={Mail}
                            IconColorFill={'none'}
                            IconColor='gray'
                            placeholder='Saisissez votre email'
                        />
                        <DateSelect
                            control={form.control}
                            name='birthdate'
                            label='Date de naissance'
                        />

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                                Téléphone *
                            </label>
                            <PhoneNumberFormApp
                                control={form.control}
                                name='phone'
                                label=''
                                placeholder='Saisissez votre numéro de téléphone'
                            />
                        </div>
                        <InputFormApp
                            control={form.control}
                            name='password'
                            label='Mot de passe'
                            type='password'
                            IconLucide={KeyRound}
                            IconColorFill='none'
                            IconColor='gray'
                            placeholder='Saisissez votre mot de passe'
                        />
                        <InputFormApp
                            control={form.control}
                            name='passwordConfirm'
                            label='Confirmez votre mot de passe'
                            type='password'
                            IconLucide={KeyRound}
                            IconColorFill='none'
                            IconColor='gray'
                            placeholder='Saisissez votre mot de passe'
                        />
                        <CheckboxFormApp
                            control={form.control}
                            name='termsOfPrivacyPolicy'
                            label={
                                <>
                                    En cliquant sur s'inscrire, vous êtes en accord avec notre{" "}
                                    <a href={routes.public.confidentiality} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                        politique de confidentialité
                                    </a>{" "}
                                    et nos{" "}
                                    <a href={routes.public.terms_of_use} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                        conditions d'utilisation
                                    </a>.
                                </>
                            }
                        />
                        {selectedAccountType === 'Announcer' && (
                            <CheckboxFormApp
                                control={form.control}
                                name='acceptAnnouncerTerms'
                                label={
                                    <>J'accepte les conditions annonceur.</>
                                }
                            />
                        )}
                        <div className='flex flex-col items-center gap-3'>
                            <ButtonApp
                                type='submit'
                                disabled={isFormLoading || isGoogleLoading}
                                isLoading={isFormLoading}
                                className='bg-gradient-to-b from-[#1FA89B] to-[#146B67] md:py-7 mt-5'
                                title={isFormLoading ? 'Création en cours...' : 'Créer un compte'}
                            />
                        </div>
                    </form>
                </section>

                <div className="flex items-center my-6 md:mt-10">
                    <div className="flex-grow h-px bg-gray-300"></div>
                    <span className="px-4 py-1 text-[#146B67] bg-[#e7f5f4] rounded-full text-sm font-medium">OU</span>
                    <div className="flex-grow h-px bg-gray-300"></div>
                </div>

                <div className="flex items-center justify-center md:mt-10">
                    <Button
                        onClick={handleSigninWithGoogle}
                        variant='outline'
                        disabled={isFormLoading || isGoogleLoading}
                        className="w-full flex justify-center items-center gap-2 bg-white dark:bg-gray-900 border border-gray-300 rounded-full p-6 text-md font-medium text-gray-800 dark:text-white hover:bg-gray-200 focus:outline-none focus:ring-offset-2 focus:ring-gray-500">
                        {isGoogleLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 dark:border-white"></div>
                                <span>Connexion en cours...</span>
                            </>
                        ) : (
                            <>
                                <svg className="h-6 w-6 mr-2" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" width="800px" height="800px" viewBox="-0.5 0 48 48" version="1.1"> <title>Google-color</title> <desc>Created with Sketch.</desc> <defs> </defs> <g id="Icons" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd"> <g id="Color-" transform="translate(-401.000000, -860.000000)"> <g id="Google" transform="translate(401.000000, 860.000000)"> <path d="M9.82727273,24 C9.82727273,22.4757333 10.0804318,21.0144 10.5322727,19.6437333 L2.62345455,13.6042667 C1.08206818,16.7338667 0.213636364,20.2602667 0.213636364,24 C0.213636364,27.7365333 1.081,31.2608 2.62025,34.3882667 L10.5247955,28.3370667 C10.0772273,26.9728 9.82727273,25.5168 9.82727273,24" id="Fill-1" fill="#FBBC05"> </path> <path d="M23.7136364,10.1333333 C27.025,10.1333333 30.0159091,11.3066667 32.3659091,13.2266667 L39.2022727,6.4 C35.0363636,2.77333333 29.6954545,0.533333333 23.7136364,0.533333333 C14.4268636,0.533333333 6.44540909,5.84426667 2.62345455,13.6042667 L10.5322727,19.6437333 C12.3545909,14.112 17.5491591,10.1333333 23.7136364,10.1333333" id="Fill-2" fill="#EB4335"> </path> <path d="M23.7136364,37.8666667 C17.5491591,37.8666667 12.3545909,33.888 10.5322727,28.3562667 L2.62345455,34.3946667 C6.44540909,42.1557333 14.4268636,47.4666667 23.7136364,47.4666667 C29.4455,47.4666667 34.9177955,45.4314667 39.0249545,41.6181333 L31.5177727,35.8144 C29.3995682,37.1488 26.7323182,37.8666667 23.7136364,37.8666667" id="Fill-3" fill="#34A853"> </path> <path d="M46.1454545,24 C46.1454545,22.6133333 45.9318182,21.12 45.6113636,19.7333333 L23.7136364,19.7333333 L23.7136364,28.8 L36.3181818,28.8 C35.6879545,31.8912 33.9724545,34.2677333 31.5177727,35.8144 L39.0249545,41.6181333 C43.3393409,37.6138667 46.1454545,31.6490667 46.1454545,24" id="Fill-4" fill="#4285F4"> </path> </g> </g> </g> </svg>
                                <span>Continuer avec Google</span>
                            </>
                        )}
                    </Button>
                </div>
            </Form>
        </div>
    )
}
