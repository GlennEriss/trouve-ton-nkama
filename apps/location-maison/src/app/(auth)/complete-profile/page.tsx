'use client'
import React, { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LayoutAuth } from '@/components/layouts/LayoutAuth'
import { InputForm } from '@/components/forms/InputForm'
import { Form } from '@/components/ui/form'
import { PhoneNumberForm } from '@/components/forms/PhoneNumberForm'
import { DateSelectForm } from '@/components/forms/DateSelectForm'
import { ButtonLoading } from '@/components/buttons/ButtonLoading'
import { useToast } from '@/hooks/use-toast'
import { routes } from '@/constantes/routes'
import { updateUser } from '@/db/user.db'
import { User } from '@/models/authentication'

// Schéma de validation pour le formulaire de complétion
const CompleteProfileSchema = z.object({
    firstname: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
    lastname: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
    phone: z.string().min(10, 'Le numéro de téléphone doit contenir au moins 10 chiffres'),
    birthDate: z.object({
        day: z.string().min(1, { message: 'Le jour est requis' }),
        month: z.string().min(1, { message: 'Le mois est requis' }),
        year: z.string().min(1, { message: 'L\'année est requise' })
    }).refine((date) => {
        // Vérifier si au moins un champ est rempli pour déclencher la validation
        if (!date.day && !date.month && !date.year) {
            return true; // Aucun champ rempli, pas d'erreur
        }
        
        // Si au moins un champ est rempli mais pas tous, afficher l'erreur d'âge
        if (!date.day || !date.month || !date.year) {
            return false;
        }
        
        const day = parseInt(date.day);
        const month = parseInt(date.month);
        const year = parseInt(date.year);
        
        // Vérifier que la date est valide
        const birthDate = new Date(year, month - 1, day);
        if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) {
            return false;
        }
        
        // Vérifier l'âge (18 ans minimum)
        const today = new Date();
        const age = today.getFullYear() - year;
        const m = today.getMonth() - (month - 1);
        const d = today.getDate() - day;

        const actualAge = m < 0 || (m === 0 && d < 0) ? age - 1 : age;
        return actualAge >= 18;
    }, {
        message: 'Vous devez avoir au moins 18 ans pour compléter votre profil',
    }),
})

type CompleteProfileFormType = z.infer<typeof CompleteProfileSchema>

export default function CompleteProfilePage() {
    const { data: session, update } = useSession()
    const router = useRouter()
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [user, setUser] = useState<User | null>(null)

    const form = useForm<CompleteProfileFormType>({
        resolver: zodResolver(CompleteProfileSchema),
        mode: 'onChange', // Validation en temps réel
        defaultValues: {
            firstname: '',
            lastname: '',
            phone: '',
            birthDate: {
                day: '',
                month: '',
                year: ''
            },
        }
    })

    // Vérifier si l'utilisateur est connecté et a besoin de compléter son profil
    useEffect(() => {
        if (session?.user) {
            const userData = session.user as User
            setUser(userData)
            
            // Ne pas pré-remplir avec les données Google (peuvent être fausses)
            // L'utilisateur doit saisir ses vraies informations
            
            // Si l'utilisateur a déjà toutes les informations, le rediriger
            if (userData.firstname && userData.lastname && userData.phoneNumbers?.[0] && userData.birthDate) {
                router.push(routes.protected.properties)
            }
        } else {
            // Si pas de session, rediriger vers la connexion
            router.push(routes.public.signin)
        }
    }, [session, router, form])

    // Empêcher l'utilisateur de quitter la page sans avoir complété ses informations
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!user?.firstname || !user?.lastname || !user?.phoneNumbers?.[0] || !user?.birthDate) {
                e.preventDefault()
                e.returnValue = 'Vous devez compléter votre profil avant de quitter cette page.'
                return 'Vous devez compléter votre profil avant de quitter cette page.'
            }
        }

        const handlePopState = (e: PopStateEvent) => {
            if (!user?.firstname || !user?.lastname || !user?.phoneNumbers?.[0] || !user?.birthDate) {
                e.preventDefault()
                window.history.pushState(null, '', window.location.href)
                toast({
                    duration: 5000,
                    title: 'Profil incomplet',
                    description: 'Vous devez compléter votre profil avant de pouvoir naviguer.',
                    variant: 'destructive',
                })
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        window.addEventListener('popstate', handlePopState)

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
            window.removeEventListener('popstate', handlePopState)
        }
    }, [user, toast])

    const onSubmit = async (values: CompleteProfileFormType) => {
        if (!user?.uid) return

        // La validation se fait automatiquement via react-hook-form et zodResolver
        // Pas besoin de faire safeParse manuellement
        
        setIsSubmitting(true)
        try {
            // Convertir la structure de date en format string
            const birthDateString = values.birthDate ? 
                `${values.birthDate.year}-${values.birthDate.month}-${values.birthDate.day}` : 
                '';

            // Mettre à jour l'utilisateur dans Firestore
            const updateSuccess = await updateUser(user.uid, {
                firstname: values.firstname,
                lastname: values.lastname,
                phoneNumbers: [values.phone],
                phoneNumberVerified: false, // Sera vérifié plus tard
                birthDate: birthDateString,
                searchableName: `${values.firstname} ${values.lastname}`,
                metadata: {
                    ...user.metadata,
                    needsProfileCompletion: false
                }
            })

            if (!updateSuccess) {
                throw new Error('Erreur lors de la mise à jour du profil')
            }

            // Mettre à jour la session
            const sessionUpdateResult = await update({
                ...session,
                user: {
                    ...user,
                    firstname: values.firstname,
                    lastname: values.lastname,
                    phoneNumbers: [values.phone],
                    phoneNumberVerified: false,
                    birthDate: birthDateString,
                    searchableName: `${values.firstname} ${values.lastname}`,
                    metadata: {
                        ...user.metadata,
                        needsProfileCompletion: false
                    }
                }
            })

            if (!sessionUpdateResult) {
                console.warn('Session update failed, but user was updated in Firestore')
            }

            toast({
                duration: 5000,
                title: 'Profil complété !',
                description: 'Vos informations ont été enregistrées avec succès.',
                variant: 'success',
            })

            // Attendre un peu pour que le toast s'affiche
            await new Promise(resolve => setTimeout(resolve, 1000))

            // Rediriger vers la page des propriétés avec une vérification
            try {
                router.push(routes.protected.properties)
                // Fallback si la redirection échoue
                setTimeout(() => {
                    if (window.location.pathname !== routes.protected.properties) {
                        window.location.href = routes.protected.properties
                    }
                }, 2000)
            } catch (redirectError) {
                console.error('Erreur lors de la redirection:', redirectError)
                // Fallback direct
                window.location.href = routes.protected.properties
            }
            
        } catch (error) {
            console.error('Erreur lors de la mise à jour du profil:', error)
            toast({
                duration: 5000,
                title: 'Erreur',
                description: 'Une erreur est survenue lors de la mise à jour de votre profil.',
                variant: 'destructive',
            })
        } finally {
            // Toujours remettre le chargement à false
            setIsSubmitting(false)
        }
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1FA89B]"></div>
            </div>
        )
    }

    return (
        <LayoutAuth
            type='CompleteProfile'
            isFormLoading={isSubmitting}
            setIsOtherMethodConnection={() => {}}
        >
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                    <h1 className="text-lg">Complétez votre profil pour finaliser votre inscription</h1>
                    
                    {/* Informations déjà fournies */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            <span className="text-sm font-medium text-blue-800">Connexion avec Google</span>
                        </div>
                        <div className="text-sm text-blue-700">
                            <p><strong>Email :</strong> {user.email}</p>
                        </div>
                    </div>
                    
                    <InputForm
                        form={form}
                        name='firstname'
                        label='Prénom'
                        type='text'
                        placeholder='Votre prénom'
                        className='p-5'
                        disabled={isSubmitting}
                    />
                    
                    <InputForm
                        form={form}
                        name='lastname'
                        label='Nom'
                        type='text'
                        placeholder='Votre nom'
                        className='p-5'
                        disabled={isSubmitting}
                    />

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            Numéro de téléphone
                        </label>
                        <PhoneNumberForm
                            form={form}
                            label=''
                            name='phone'
                            disabled={isSubmitting}
                        />
                    </div>

                    <DateSelectForm
                        form={form}
                        name='birthDate'
                        label='Date de naissance'
                        className='p-5'
                        disabled={isSubmitting}
                    />

                    <ButtonLoading
                        type='submit'
                        disabled={isSubmitting}
                        className='w-full bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67]'>
                        {isSubmitting ? 'Enregistrement en cours...' : 'Compléter mon profil'}
                    </ButtonLoading>
                    
                    <div className="pt-4 border-t border-gray-200">
                        <button
                            type='button'
                            onClick={() => signOut({ callbackUrl: routes.public.signin })}
                            className='w-full py-3 px-4 text-gray-500 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors text-sm'>
                            Se déconnecter
                        </button>
                    </div>
                </form>
            </Form>
        </LayoutAuth>
    )
} 