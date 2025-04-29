'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import React from 'react'
import { useForm } from 'react-hook-form'
import { Form } from '../ui/form'
import { FormUserProfilSchemaType, FormUserProfilSchema } from '@/models/schema'
import { InputForm } from '../forms/InputForm'
import { useCurrentUser } from '@/hooks/use-current-user'
import { countries } from '@/constantes/country'
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


export default function FormPersonalInformation() {
    const { user } = useCurrentUser()
    const { data: session, status, update } = useSession()
    const { toast } = useToast();
    const size = useWindowSize()
    const form = useForm<FormUserProfilSchemaType>({
        resolver: zodResolver(FormUserProfilSchema),
    })
    const onSubmit = async (values: FormUserProfilSchemaType) => {
        const userUpdated = {
            ...user,
            ...values,
            country: countries.find(country => country.code === values.country),
            phoneNumbers: values.phoneNumbers ? [values.phoneNumbers] : []
        }
        const isUpdated = await updateUser(user?.uid!, userUpdated)
        if (isUpdated) {
            toast({
                title: "Modification du profil",
                description: "Votre profil a été modifié avec succès!",
                variant: "success",
            });
            update({
                user: userUpdated
            })
        } else {
            toast({
                title: "Erreur de modification du profil",
                description: "Une erreur est survenue lors de la modification de votre profil.",
                variant: "destructive",
            });
        }
    }
    React.useEffect(() => {
        if (user) {
            form.setValue('firstname', user.firstname)
            form.setValue('lastname', user.lastname)
            form.setValue('email', user.email!)
            form.setValue('birthDate', user?.birthDate ?? '')
            form.setValue('country', user?.country?.code ?? '')
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
                            name='birthDate'
                            label='Date de naissance'
                            type='date'
                            IconLucide={Calendar}
                            IconColorFill={'none'}
                            IconColor='gray'
                            placeholder='Saisissez votre date de naissance'
                        />
                        <SelectFormApp
                            control={form.control}
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
                        <PhoneNumberFormApp
                            control={form.control}
                            name='phoneNumbers'
                            label='Téléphone'
                            placeholder='Saisissez votre numéro de téléphone'
                        />
                        <div className='flex flex-col items-center gap-3'>
                            <ButtonApp
                                type='submit'
                                disabled={form.formState.isSubmitting || form.formState.isLoading }
                                isLoading={form.formState.isSubmitting || form.formState.isLoading }
                                className='bg-gradient-to-b from-[#1FA89B] to-[#146B67] md:py-7 mt-5'
                                title='Modifier'
                            />
                        </div>
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
                    />
                    <InputForm
                        name='lastname'
                        form={form}
                        label={'Prénom'}
                    />
                    <InputForm
                        name='email'
                        form={form}
                        label={'Email'}
                        type='email'
                        disabled={true}
                    />
                    <InputForm
                        key={3}
                        form={form}
                        name='birthDate'
                        label='Date de naissance'
                        type='date'
                        className='p-5'
                    />
                    <SelectForm
                        form={form}
                        name='country'
                        label='Pays'
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
                        label='Téléphone'
                        name='phoneNumbers'
                    />
                    <ButtonLoading
                        type="submit"
                        className="w-full bg-black text-white font-bold border border-transparent 
              dark:bg-gray-900 dark:text-white dark:border-gray-700 
              hover:bg-gray-800 dark:hover:bg-gray-700 
              focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 
              disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={form.formState.isLoading || form.formState.isSubmitting}
                    >
                        Modifier
                    </ButtonLoading>
                </form>
            </Form>
        </div>


    )
}
