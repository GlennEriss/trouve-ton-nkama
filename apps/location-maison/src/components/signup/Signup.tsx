'use client'
import React from 'react'
import { LayoutAuth } from '../layouts/LayoutAuth'
import { useForm } from 'react-hook-form'
import { FormRegisterSchemaType, FormRegisterSchema } from '@/models/schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { InputForm } from '../forms/InputForm'
import { Form } from '../ui/form'
import { SelectForm } from '../forms/SelectForm'
import { countries } from '@/constantes/country'
import { PhoneNumberForm } from '../forms/PhoneNumberForm'
import { CheckboxForm } from '../forms/CheckboxForm'
import { ButtonLoading } from '../buttons/ButtonLoading'
import { transformToPerson } from '@/lib/transformToPerson'
import { User } from '@/models/authentication'
import { createUser, findUserByPhoneNumber } from '@/db/user.db'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { NotificationParameter } from '@/models/notification'
//import { createNotification } from '@/db/notification.db'
import { routes } from '@/constantes/routes'

export const Signup: React.FC = () => {
    const router = useRouter()
    const { toast } = useToast()
    const [isOtherMethodConnection, setIsOtherMethodConnection] = React.useState(false)
    const [isRegistering, setIsRegistering] = React.useState(false)
    
    const form = useForm<FormRegisterSchemaType>({
        resolver: zodResolver(FormRegisterSchema),
        defaultValues: {
            firstname: '',
            lastname: '',
            email: '',
            password: '',
            passwordConfirm: '',
            birthdate: '',
            country: 'GA',
            phone: '',
            termsOfPrivacyPolicy: false
        }
    })
    
    const onRegister = async (user: Partial<User>) => {
        try {
            if (user.phoneNumbers && user.phoneNumbers.length > 0) {
                const existingUser = await findUserByPhoneNumber(user.phoneNumbers[0]);
                if (existingUser) {
                    throw new Error("Un numéro est déjà associé à un compte.");
                }
            }
            const getAuth = () => import("@/firebase/auth");
            const { createUserWithEmailAndPassword, auth, signOut } = await getAuth();
            const userCred = await createUserWithEmailAndPassword(
                auth,
                user.login!,
                user.password!
            );
            
            // Envoyer l'email de vérification via notre API
            try {
                const emailResponse = await fetch('/api/auth/send-verification-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: user.login!,
                    }),
                });
                
                if (!emailResponse.ok) {
                    console.warn('Erreur lors de l\'envoi de l\'email de vérification, mais le compte a été créé');
                }
            } catch (emailError) {
                console.warn('Erreur lors de l\'envoi de l\'email de vérification:', emailError);
                // Ne pas faire échouer l'inscription si l'email ne peut pas être envoyé
            }
            
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
        } catch (error) {
            console.error(error)
            toast({
                duration: 5000,
                title: 'Création de compte',
                description: "L'adresse email est déjà utilisé!",
                variant: 'destructive',
            });
        } finally {
            setIsRegistering(false)
        }
    }
    
    const isLoading = isRegistering || form.formState.isSubmitting || isOtherMethodConnection
    
    return (
        <LayoutAuth
            type='Signup'
            setIsOtherMethodConnection={setIsOtherMethodConnection}
            isFormLoading={isLoading}
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
                    <InputForm
                        form={form}
                        name='birthdate'
                        label='Date de naissance'
                        type='date'
                        className='p-5'
                    />
                    <SelectForm
                        form={form}
                        name='country'
                        label='Votre pays'
                        placeholder='Sélectionner un pays'
                        options={countries.map(
                            country => ({
                                value: country.code,
                                label: country.name
                            })
                        )}
                    />
                    <PhoneNumberForm
                        form={form}
                        label='Votre numéro de téléphone'
                        name='phone'
                    />
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
                        disabled={isLoading}
                        className='w-full bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67]'>
                        {isLoading ? 'Création en cours...' : 'S\'enregistrer'}
                    </ButtonLoading>
                </form>
            </Form>
        </LayoutAuth>
    )
}
