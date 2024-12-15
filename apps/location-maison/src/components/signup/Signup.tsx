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

export const Signup: React.FC = () => {
    const form = useForm<FormRegisterSchemaType>({
        resolver: zodResolver(FormRegisterSchema)
    })
    const onSubmit = () => {

    }
    return (
        <LayoutAuth type='Signup'>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                    <h1 className="text-lg">Créer un compte pour commencer à poster des annonces</h1>
                    <InputForm
                        form={form as any}
                        name='firstname'
                        label='Nom'
                        type='text'
                        placeholder='John'
                        className='p-5'
                    />
                    <InputForm
                        form={form as any}
                        name='lastname'
                        label='Prénom'
                        type='text'
                        placeholder='Doe'
                        className='p-5'
                    />
                    <InputForm
                        form={form as any}
                        name='email'
                        label='Email'
                        type='email'
                        placeholder='johndoe@mail.test'
                        className='p-5'
                    />
                    <InputForm
                        form={form as any}
                        name='birthdate'
                        label='Date de naissance'
                        type='date'
                        className='p-5'
                    />
                    <SelectForm
                        form={form as any}
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
                        form={form as any}
                        label='Votre numéro de téléphone'
                        name='phone'
                    />
                    <InputForm
                        form={form as any}
                        name='password'
                        label='Mot de passe'
                        type='password'
                        placeholder='*******'
                        className='p-5'
                    />
                    <InputForm
                        form={form}
                        name='password'
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
                </form>
            </Form>
        </LayoutAuth>
    )
}
