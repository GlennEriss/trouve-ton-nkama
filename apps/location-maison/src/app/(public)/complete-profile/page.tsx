'use client'
import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { PhoneNumberForm } from '@/components/forms/PhoneNumberForm'
import { useToast } from '@/hooks/use-toast'
import { routes } from '@/constantes/routes'
import { updateUser } from '@/db/user.db'
import { User } from '@/models/authentication'
import { CheckCircle, AlertTriangle, User as UserIcon } from 'lucide-react'

// Schéma de validation pour le formulaire de complétion
const CompleteProfileSchema = z.object({
    firstname: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
    lastname: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
    phone: z.string().min(10, 'Le numéro de téléphone doit contenir au moins 10 chiffres'),
    birthDate: z.string().min(1, 'La date de naissance est obligatoire'),
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

            // Rediriger vers la page principale
            router.push(routes.protected.properties)
        } catch (error) {
            console.error('Erreur lors de la mise à jour du profil:', error)
            toast({
                duration: 5000,
                title: 'Erreur',
                description: 'Une erreur est survenue lors de la mise à jour de votre profil.',
                variant: 'destructive',
            })
        } finally {
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
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="w-12 h-12 bg-[#1FA89B] rounded-full flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-white" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Complétez votre profil
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Pour finaliser votre inscription, nous avons besoin de quelques informations supplémentaires
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    {/* Informations existantes */}
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">Informations déjà fournies</span>
                        </div>
                        <div className="text-sm text-blue-700">
                            <p><strong>Email :</strong> {user.email}</p>
                        </div>
                    </div>

                    {/* Informations manquantes */}
                    <div className="mb-6 p-4 bg-orange-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                            <span className="text-sm font-medium text-orange-800">Informations à compléter</span>
                        </div>
                        <div className="text-sm text-orange-700">
                            <p>• Prénom et nom</p>
                            <p>• Numéro de téléphone</p>
                            <p>• Date de naissance</p>
                        </div>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="firstname"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Prénom *</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="Votre prénom"
                                                className="p-3"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="lastname"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nom *</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="Votre nom"
                                                className="p-3"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Numéro de téléphone *
                                </label>
                                <PhoneNumberForm
                                    form={form}
                                    label=''
                                    name='phone'
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="birthDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Date de naissance *</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="date"
                                                className="p-3"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="text-xs text-gray-500">
                                <p>• Ces informations sont nécessaires pour finaliser votre compte</p>
                                <p>• Vos informations personnelles sont protégées et confidentielles</p>
                            </div>

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] p-3"
                            >
                                {isSubmitting ? 'Enregistrement...' : 'Compléter mon profil'}
                            </Button>
                        </form>
                    </Form>

                    <div className="mt-6 text-center">
                        <div className="text-xs text-gray-500 mb-2">
                            <p>⚠️ Vous devez compléter votre profil pour accéder à l'application</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                toast({
                                    duration: 5000,
                                    title: 'Profil requis',
                                    description: 'Vous devez compléter votre profil avant de pouvoir continuer.',
                                    variant: 'destructive',
                                })
                            }}
                            className="text-sm text-gray-600 hover:text-gray-800 underline"
                        >
                            Pourquoi ces informations sont obligatoires ?
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
} 