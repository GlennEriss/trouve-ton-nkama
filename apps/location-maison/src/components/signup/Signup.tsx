'use client'
import React from 'react'
import { LayoutAuth } from '../layouts/LayoutAuth'
import { useForm } from 'react-hook-form'
import { FormRegisterSchemaType, FormRegisterSchema } from '@/models/schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { InputForm } from '../forms/InputForm'
import { Form } from '../ui/form'
import { SelectForm } from '../forms/SelectForm'
import { DateSelectForm } from '../forms/DateSelectForm'

import { PhoneNumberForm } from '../forms/PhoneNumberForm'
import { CheckboxForm } from '../forms/CheckboxForm'
import { ButtonLoading } from '../buttons/ButtonLoading'
import { transformToPerson } from '@/lib/transformToPerson'
import { User } from '@/models/authentication'
import { createUser, findUserByPhoneNumber } from '@/db/user.db'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { NotificationParameter } from '@/models/notification'
import { routes } from '@/constantes/routes'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

export const Signup: React.FC = () => {
    const router = useRouter()
    const { toast } = useToast()
    const [isOtherMethodConnection, setIsOtherMethodConnection] = React.useState(false)
    const [isRegistering, setIsRegistering] = React.useState(false)
    
    const form = useForm<FormRegisterSchemaType>({
        resolver: zodResolver(FormRegisterSchema),
        mode: 'onChange', // Validation en temps réel
        defaultValues: {
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




    
    const onRegister = async (user: Partial<User>) => {
        try {
            // Vérification obligatoire du numéro de téléphone
            if (!user.phoneNumbers || user.phoneNumbers.length === 0 || !user.phoneNumbers[0]) {
                throw new Error("Le numéro de téléphone est obligatoire.");
            }
            
            // Vérification si le numéro est déjà associé à un compte
            const existingUser = await findUserByPhoneNumber(user.phoneNumbers[0]);
            if (existingUser) {
                throw new Error("Un numéro est déjà associé à un compte.");
            }
            
            const getAuth = () => import("@/firebase/auth");
            const { createUserWithEmailAndPassword, auth, signOut } = await getAuth();
            const userCred = await createUserWithEmailAndPassword(
                auth,
                user.login!,
                user.password!
            );
            
            // Supprimer le numéro de téléphone de Firebase Auth après création du compte
            // Note: Le numéro de téléphone est vérifié par OTP mais reste dans notre base de données
            // Firebase Auth utilise email/mot de passe pour l'authentification
            //console.log("Numéro de téléphone vérifié et stocké dans la base de données");
            
            // Envoyer l'email de vérification en arrière-plan (non-bloquant)
            fetch('/api/auth/send-verification-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: user.login!,
                }),
            }).then(response => {
                if (!response.ok) {
                    console.warn('Erreur lors de l\'envoi de l\'email de vérification, mais le compte a été créé');
                }
            }).catch(error => {
                console.warn('Erreur lors de l\'envoi de l\'email de vérification:', error);
                // L'email peut échouer sans affecter l'inscription
            });
            
            const { password, ...userDetails } = user
            const notificationParameter: NotificationParameter = {
                isNew: true,
                isAccountActivity: true,
                isNewAnnouncement: true,
                isFavoris: true,
                isPersonalizedSuggestions: true,
                isSystemUpdated: true
            }
            await createUser({
                ...userDetails,
                uid: userCred.user.uid,
                notificationParameter,
                providers: ['CREDENTIALS']
            })
            await signOut(auth)
            return userCred.user.uid
        } catch (error) {
            console.error("Error during registration:", error);
            throw error;
        }
    }

    const onSubmit = async (values: FormRegisterSchemaType) => {
        console.log("OnRegister",values)

        // La validation se fait automatiquement via react-hook-form et zodResolver
        // Pas besoin de faire safeParse manuellement
        
        setIsRegistering(true)
        try {
            const user = transformToPerson(values)
            const uid = await onRegister(user)
            
            toast({
                duration: 5000,
                title: 'Création de compte',
                description: "Votre compte a été créé avec succès!",
                variant: 'success',
            });
            
            router.push('/signup/success?uid=' + uid)
        } catch (error: any) {
            console.error(error)
            
            // Gestion spécifique des erreurs Firebase
            let errorMessage = "Une erreur est survenue lors de la création du compte."
            let errorTitle = "Création de compte"
            
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "Cette adresse email est déjà utilisée par un autre compte."
                errorTitle = "Email déjà utilisé"
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "L'adresse email fournie n'est pas valide."
                errorTitle = "Email invalide"
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "Le mot de passe est trop faible. Il doit contenir au moins 6 caractères."
                errorTitle = "Mot de passe faible"
            } else if (error.code === 'auth/operation-not-allowed') {
                errorMessage = "L'inscription par email/mot de passe n'est pas activée."
                errorTitle = "Méthode non autorisée"
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = "Trop de tentatives. Veuillez attendre quelques minutes avant de réessayer."
                errorTitle = "Trop de tentatives"
            } else if (error.message && error.message.includes("numéro est déjà associé")) {
                errorMessage = error.message
                errorTitle = "Numéro déjà utilisé"
            } else if (error.message && error.message.includes("numéro de téléphone est obligatoire")) {
                errorMessage = "Le numéro de téléphone est obligatoire"
                errorTitle = "Numéro de téléphone manquant"
            } else if (error.message && error.message.includes("numéro de téléphone est invalide")) {
                errorMessage = "Le numéro de téléphone est invalide"
                errorTitle = "Numéro de téléphone invalide"
            } else {
                // Pour les autres erreurs, utiliser le message d'erreur original
                errorMessage = error.message || "Une erreur inattendue s'est produite."
            }
            
            toast({
                duration: 5000,
                title: errorTitle,
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsRegistering(false)
        }
    }
    
    const isFormLoading = isRegistering || form.formState.isSubmitting
    const isGoogleLoading = isOtherMethodConnection
    
    return (
        <LayoutAuth
            type='Signup'
            setIsOtherMethodConnection={setIsOtherMethodConnection}
            isFormLoading={isFormLoading || isGoogleLoading}
        >
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                    <h1 className="text-lg">Créer un compte pour commencer à poster des annonces</h1>
                    <InputForm
                        form={form}
                        name='firstname'
                        label='Nom'
                        type='text'
                        placeholder='John'
                        className='p-5'
                    />
                    <InputForm
                        form={form}
                        name='lastname'
                        label='Prénom'
                        type='text'
                        placeholder='Doe'
                        className='p-5'
                    />
                    <InputForm
                        form={form}
                        name='email'
                        label='Email'
                        type='email'
                        placeholder='johndoe@mail.test'
                        className='p-5'
                    />
                    <DateSelectForm
                        form={form}
                        name='birthdate'
                        label='Date de naissance'
                        className='p-5'
                    />

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            Votre numéro de téléphone
                        </label>
                        <PhoneNumberForm
                            form={form}
                            label=''
                            name='phone'
                        />
                    </div>
                    <InputForm
                        form={form}
                        name='password'
                        label='Mot de passe'
                        type='password'
                        placeholder='*******'
                        className='p-5'
                    />
                    <InputForm
                        form={form}
                        name='passwordConfirm'
                        label='Mot de passe'
                        type='password'
                        placeholder='*******'
                        className='p-5'
                    />
                    <CheckboxForm
                        form={form}
                        name={'termsOfPrivacyPolicy'}
                        labelElement={
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
                    <ButtonLoading
                        type='submit'
                        disabled={isFormLoading || isGoogleLoading}
                        className='w-full bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67]'>
                        {isFormLoading ? 'Création en cours...' : 'S\'enregistrer'}
                    </ButtonLoading>
                    
                </form>
            </Form>
        </LayoutAuth>
    )
}
