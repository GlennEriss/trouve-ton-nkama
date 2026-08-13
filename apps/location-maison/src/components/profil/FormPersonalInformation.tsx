'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import React from 'react'
import { useForm } from 'react-hook-form'
import { Form } from '@/components/ui/form'
import { FormUserProfilSchemaType, FormUserProfilSchema } from '@/models/schema'
import { InputForm } from '../forms/InputForm'
import { useCurrentUser } from '@/hooks/use-current-user'

import { PhoneNumberForm } from '../forms/PhoneNumberForm'
import { SelectForm } from '../forms/SelectForm'
import { ButtonLoading } from '../buttons/ButtonLoading'
import { updateUser } from '@/db/user.db'
import { useToast } from '@/hooks/use-toast';
import { useSession } from "next-auth/react"
import { useWindowSize } from '../../hooks/useSize';
import { InputFormApp } from '../shared/form/InputFormApp'
import { Calendar, CircleUser } from 'lucide-react'
import { SelectFormApp } from '../shared/form/SelectFormApp'
import { PhoneNumberFormApp } from '../shared/form/PhoneNumberFormApp'
import { ButtonApp } from '../shared/ui/ButtonApp'
import { parseDateString } from '@/lib/dateUtils'
import { DateSelect } from '../shared/form/DateSelect'
import { DateSelectForm } from '../forms/DateSelectForm'


export default function FormPersonalInformation() {
    const { user } = useCurrentUser()
    const { update } = useSession()
    const { toast } = useToast();
    const size = useWindowSize()
    const form = useForm<FormUserProfilSchemaType>({
        resolver: zodResolver(FormUserProfilSchema),
    })
    
    const onSubmit = async (values: FormUserProfilSchemaType) => {
        // Ne mettre à jour que le numéro de téléphone avec Gabon par défaut
        const userUpdated = {
            ...user,
            phoneNumbers: values.phoneNumbers ? [values.phoneNumbers] : [],
            country: { code: 'GA', name: 'Gabon' }
        }
        const isUpdated = await updateUser(user?.uid ?? '', userUpdated)
        if (isUpdated) {
            toast({
                duration: 5000,
                title: "Numéro de téléphone modifié",
                description: "Votre numéro de téléphone a été mis à jour avec succès!",
                variant: "success",
            });
            update({
                user: userUpdated
            })
        } else {
            toast({
                duration: 5000,
                title: "Erreur de modification",
                description: "Une erreur est survenue lors de la modification de votre numéro de téléphone.",
                variant: "destructive",
            });
        }
    }

    React.useEffect(() => {
        if (user) {
            form.setValue('firstname', user.firstname)
            form.setValue('lastname', user.lastname)
            form.setValue('email', user.email ?? '')
            
            // Utiliser directement la date string du schéma
            form.setValue('birthDate', user?.birthDate ?? '')
            
            form.setValue('phoneNumbers', user.phoneNumbers.length > 0 ? user.phoneNumbers[0] : '')
        }
    }, [user])

    if (size.width < 768) {
        return (
            <div className='px-4 pb-5'>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 mt-5">
                        <InputFormApp
                            control={form.control}
                            name='firstname'
                            label='Nom'
                            type='text'
                            IconLucide={CircleUser}
                            IconColorFill={'none'}
                            IconColor='gray'
                            placeholder='Saisissez votre nom'
                            disabled={true}
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
                            disabled={true}
                        />
                        <DateSelect
                            control={form.control}
                            name='birthDate'
                            label='Date de naissance'
                            disabled={true}
                        />

                        <PhoneNumberFormApp
                            control={form.control}
                            name='phoneNumbers'
                            label='Téléphone'
                            placeholder='Saisissez votre numéro de téléphone'
                            disabled={user?.phoneNumberVerified}
                        />
                        {!user?.phoneNumberVerified && (
                            <div className='flex flex-col items-center gap-3'>
                                <ButtonApp
                                    type='submit'
                                    disabled={Boolean(form.formState.isSubmitting) || Boolean(form.formState.isLoading)}
                                    isLoading={Boolean(form.formState.isSubmitting) || Boolean(form.formState.isLoading)}
                                    className='bg-gradient-to-b from-secondary to-primary md:py-7 mt-5'
                                    title='Modifier le téléphone'
                                />
                            </div>
                        )}
                    </form>
                </Form>
            </div>
        )
    }
    return (
        <div className='md:w-2/3 md:mx-auto lg:w-3/5'>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 mt-5">
                    <InputForm
                        name='firstname'
                        form={form}
                        label={'Nom'}
                        disabled={true}
                    />
                    <InputForm
                        name='lastname'
                        form={form}
                        label={'Prénom'}
                        disabled={true}
                    />
                    <InputForm
                        name='email'
                        form={form}
                        label={'Email'}
                        type='email'
                        disabled={true}
                    />
                    <DateSelectForm
                        form={form}
                        name='birthDate'
                        label='Date de naissance'
                        className='p-5'
                        disabled={true}
                    />

                    <PhoneNumberForm
                        form={form}
                        label='Téléphone'
                        name='phoneNumbers'
                        disabled={user?.phoneNumberVerified}
                    />
                    {!user?.phoneNumberVerified && (
                        <ButtonLoading
                            type="submit"
                            className="w-full bg-black text-white font-bold border border-transparent 
                  dark:bg-gray-900 dark:text-white dark:border-gray-700 
                  hover:bg-gray-800 dark:hover:bg-gray-700 
                  focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 
                  disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={Boolean(form.formState.isLoading) || Boolean(form.formState.isSubmitting)}
                        >
                            Modifier le numéro de téléphone
                        </ButtonLoading>
                    )}
                </form>
            </Form>
        </div>


    )
}
