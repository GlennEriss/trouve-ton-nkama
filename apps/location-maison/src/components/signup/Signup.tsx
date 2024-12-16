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
import { createUser } from '@/db/user.db'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

export const Signup: React.FC = () => {
    const router = useRouter()
    const { toast } = useToast()
    const form = useForm<FormRegisterSchemaType>({
        resolver: zodResolver(FormRegisterSchema)
    })
    const onRegister = async (user: Partial<User>) => {
        try {
            const getAuth = () => import("@/firebase/auth");
            const { createUserWithEmailAndPassword, sendEmailVerification, auth, signOut } = await getAuth();
            const userCred = await createUserWithEmailAndPassword(
                auth,
                user.login!,
                user.password!
            );
            await sendEmailVerification(userCred.user);
            const { password, ...userDetails } = user
            const id = await createUser({ ...userDetails, uid: userCred.user.uid })
            await signOut(auth)
            return userCred.user.uid
        } catch (error) {
            console.error("Error during registration:", error);
            throw error;
        }
    }
    const onSubmit = (values: FormRegisterSchemaType) => {
        const user = transformToPerson(values)
        onRegister(user)
            .then((uid) => {
                toast({
                    title: 'Création de compte',
                    description: "Votre compte a été créé avec succès!",
                    variant: 'success',
                });
                router.push('/signup/success?uid=' + uid)
            })
            .catch(error => {
                console.error(error)
                toast({
                    title: 'Création de compte',
                    description: "Une erreur est survenue durant la création du compte!" + error,
                    variant: 'destructive',
                });
            })
    }
    return (
        <LayoutAuth type='Signup'>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                    <h1 className="text-lg">Créer un compte pour commencer à poster des annonces</h1>
                    <InputForm
                        key={0}
                        form={form}
                        name='firstname'
                        label='Nom'
                        type='text'
                        placeholder='John'
                        className='p-5'
                    />
                    <InputForm
                        key={1}
                        form={form}
                        name='lastname'
                        label='Prénom'
                        type='text'
                        placeholder='Doe'
                        className='p-5'
                    />
                    <InputForm
                        key={2}
                        form={form}
                        name='email'
                        label='Email'
                        type='email'
                        placeholder='johndoe@mail.test'
                        className='p-5'
                    />
                    <InputForm
                        key={3}
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
                        key={4}
                        form={form}
                        name='password'
                        label='Mot de passe'
                        type='password'
                        placeholder='*******'
                        className='p-5'
                    />
                    <InputForm
                        key={5}
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
                        label="En cliquant sur s'inscrire, vous êtes en accord avec notre politique de confidentialité"
                    />
                    <ButtonLoading type='submit' disabled={form.formState.isSubmitting} className='w-full'>
                        S'enregistrer
                    </ButtonLoading>
                </form>
            </Form>
        </LayoutAuth>
    )
}
