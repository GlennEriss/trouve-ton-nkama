'use client'
import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LayoutAuth } from '@/components/layouts/LayoutAuth'
import { InputForm } from '@/components/forms/InputForm'
import { Form } from '@/components/ui/form'
import { PhoneNumberForm } from '@/components/forms/PhoneNumberForm'
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
    birthDate: z.string().min(1, 'La date de naissance est obligatoire')
        .refine((date) => {
            const birthDate = new Date(date);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            // Ajuster l'âge si l'anniversaire n'est pas encore passé cette année
            const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
                ? age - 1 
                : age;
            
            return actualAge >= 18;
        }, 'Vous devez avoir au moins 18 ans pour utiliser cette plateforme'),
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
        defaultValues: {
            firstname: '',
            lastname: '',
            phone: '',
            birthDate: '',
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

        setIsSubmitting(true)
        try {
            // Mettre à jour l'utilisateur dans Firestore
            const updateSuccess = await updateUser(user.uid, {
                firstname: values.firstname,
                lastname: values.lastname,
                phoneNumbers: [values.phone],
                phoneNumberVerified: false, // Sera vérifié plus tard
                birthDate: values.birthDate,
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
            await update({
                ...session,
                user: {
                    ...user,
                    firstname: values.firstname,
                    lastname: values.lastname,
                    phoneNumbers: [values.phone],
                    phoneNumberVerified: false,
                    birthDate: values.birthDate,
                    searchableName: `${values.firstname} ${values.lastname}`,
                    metadata: {
                        ...user.metadata,
                        needsProfileCompletion: false
                    }
                }
            })

            toast({
                duration: 5000,
                title: 'Profil complété !',
                description: 'Vos informations ont été enregistrées avec succès.',
                variant: 'success',
            })

            // Garder le chargement affiché pendant la redirection
            // Ne pas remettre setIsSubmitting(false) ici
            router.push(routes.protected.properties)
        } catch (error) {
            console.error('Erreur lors de la mise à jour du profil:', error)
            toast({
                duration: 5000,
                title: 'Erreur',
                description: 'Une erreur est survenue lors de la mise à jour de votre profil.',
                variant: 'destructive',
            })
            // Remettre le chargement à false seulement en cas d'erreur
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

                    <InputForm
                        form={form}
                        name='birthDate'
                        label='Date de naissance'
                        type='date'
                        className='p-5'
                        disabled={isSubmitting}
                    />

                    <ButtonLoading
                        type='submit'
                        disabled={isSubmitting}
                        className='w-full bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67]'>
                        {isSubmitting ? 'Enregistrement en cours...' : 'Compléter mon profil'}
                    </ButtonLoading>
                </form>
            </Form>
        </LayoutAuth>
    )
} 