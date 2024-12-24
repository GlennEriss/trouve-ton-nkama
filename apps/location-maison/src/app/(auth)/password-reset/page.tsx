"use client"

import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { useForm } from 'react-hook-form';
import { MdEmail } from 'react-icons/md';
import * as z from "zod";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { auth, sendPasswordResetEmail } from '@/firebase/auth';
import { routes } from '@/constantes/routes';

export default function PasswordResetRequest() {
    const { toast } = useToast();

    const FormSchema = z.object({
        email: z.string().email({ message: "L'email est obligatoire" }),
    });

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            email: "",
        },
    });

    async function onSubmit(data: z.infer<typeof FormSchema>) {
        try {
            await sendPasswordResetEmail(auth, data.email);
            toast({
                title: "Succès",
                description: "Un email de réinitialisation a été envoyé.",
                variant: "success",
            });
        } catch (error: any) {
            toast({
                title: "Erreur",
                description: error.message || "Une erreur est survenue.",
                variant: "destructive",
            });
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4">

            {/* Form Section */}
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
                <h1 className="text-2xl font-bold text-gray-800 text-center">Réinitialisation du mot de passe</h1>
                <p className="text-gray-600 text-center mt-2">
                    Entrez votre email pour recevoir un lien de réinitialisation.
                </p>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
                        {/* Email Input */}
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field, fieldState: { error } }) => (
                                <FormItem>
                                    <FormControl>
                                        <div className="relative">
                                            <MdEmail className="absolute left-3 top-2 text-gray-400 text-xl" />
                                            <Input
                                                type="email"
                                                {...field}
                                                placeholder="Email"
                                                className="pl-10 text-black border-gray-300 focus:ring-app-color focus:border-app-color"
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-red-500 text-sm mt-1">{error?.message}</FormMessage>
                                </FormItem>
                            )}
                        />

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full hover:bg-opacity-90 font-semibold py-3 rounded-lg"
                            disabled={form.formState.isSubmitting}
                        >
                            {
                                form.formState.isSubmitting ? (
                                    <div className="w-5 h-5 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
                                ) : (
                                    <span>Envoyer le lien</span>
                                )
                            }
                        </Button>
                    </form>
                </Form>

                {/* Back to Login */}
                <div className="mt-4 text-center">
                    <Link href={routes.public.signin} className="text-app-color hover:underline">
                        Revenir sur la page de connexion
                    </Link>
                </div>
            </div>
        </div>
    );
}