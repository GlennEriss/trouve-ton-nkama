'use client'
import React from 'react'
import { LayoutAuth } from '../layouts/LayoutAuth'
import { zodResolver } from '@hookform/resolvers/zod';
import { FormLoginSchema, FormLoginSchemaType } from '@/models/schema';
import { useForm } from 'react-hook-form';
import { Form } from '../ui/form';
import { InputForm } from '../forms/InputForm';
import Link from 'next/link';
import { ButtonLoading } from '../buttons/ButtonLoading';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { login } from '@/actions/login';
import { routes } from '@/constantes/routes';

export const Signin = () => {
    const router = useRouter()
    const [isPending, startTransition] = React.useTransition()
    const { toast } = useToast()
    const form = useForm<FormLoginSchemaType>({
        resolver: zodResolver(FormLoginSchema)
    })
    const onSubmit = async (values: FormLoginSchemaType) => {
        startTransition(async () => {
            const result = await login(values)
            if (result?.error) {
                toast({
                    title: 'Erreur de connexion',
                    description: "Email ou mot de passe incorrect!",
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Connexion réussie',
                    description: "Vous vous êtes connectés avec succès!",
                    variant: 'success',
                });
                router.push(routes.protected.properties); // Redirection après succès
            }
        })
    }
    return (
        <LayoutAuth type='Signin'>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                    <h1 className="text-lg">Heureux de vous revoir, connectez-vous</h1>
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
                        name='password'
                        label='Mot de passe'
                        type='password'
                        placeholder='*******'
                        className='p-5'
                    />
                    <Link href='' className='text-red-500 flex justify-end text-sm'>
                        Mot de passe oublié?
                    </Link>
                    <ButtonLoading type='submit' disabled={form.formState.isSubmitting || form.formState.isLoading} className='w-full'>
                        Se connecter
                    </ButtonLoading>
                </form>
            </Form>
        </LayoutAuth>
    )
}
