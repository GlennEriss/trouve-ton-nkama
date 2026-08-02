'use client';

import { routes } from '@/constantes/routes';
import { useSignin, mapSigninError } from '@/features/auth/hooks';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { FormLoginSchema, FormLoginSchemaType } from '@/models/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, CircleUser, KeyRound } from 'lucide-react';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Form } from '../ui/form';
import { InputFormApp } from '../shared/form/InputFormApp';
import { ButtonApp } from '../shared/ui/ButtonApp';
import { Button } from '../ui/button';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400'],
});

export default function SigninMobileComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const {
    signinWithCredentials,
    signinWithGoogle,
    isLoading,
    isCredentialsLoading,
    isGoogleLoading,
    lastError,
    clearError,
  } = useSignin();

  const form = useForm<FormLoginSchemaType>({
    resolver: zodResolver(FormLoginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: FormLoginSchemaType) => {
    const parsed = FormLoginSchema.safeParse(values);
    if (!parsed.success) {
      const error = mapSigninError();
      toast({
        duration: error.duration,
        title: error.title,
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    const result = await signinWithCredentials(parsed.data);
    if (!result.success) {
      const error = result.error ?? mapSigninError();
      toast({
        duration: error.duration,
        title: error.title,
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      duration: 5000,
      title: 'Connexion réussie',
      description: 'Vous vous êtes connectés avec succès!',
      variant: 'success',
    });
    router.push(result.redirectTo ?? routes.public.search_property);
  };

  useEffect(() => {
    const error = searchParams.get('error');
    if (!error) {
      return;
    }
    const mapped = mapSigninError(error);
    toast({
      duration: mapped.duration,
      title: mapped.title,
      description: mapped.message,
      variant: 'destructive',
    });
    router.replace(routes.public.signin);
  }, [router, searchParams, toast]);

  useEffect(() => {
    if (!lastError) {
      return;
    }
    toast({
      duration: lastError.duration,
      title: lastError.title,
      description: lastError.message,
      variant: 'destructive',
    });
    clearError();
  }, [clearError, lastError, toast]);

  return (
    <div className={cn('min-h-dvh bg-white p-4 text-gray-900 dark:bg-gray-950 dark:text-white md:p-20', inter.className)}>
      <div>
        <Link
          href={routes.public.homePage}
          aria-label="Retour à l'accueil"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-gray-800"
        >
          <ChevronLeft color="gray" size={30} />
        </Link>
      </div>

      <section className="mt-8 md:mt-10">
        <h1 className="text-2xl font-bold text-primary">Bienvenue sur Trouve Ton Nkama !</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Connectez-vous pour retrouver vos annonces, favoris et paramètres de compte.
        </p>
      </section>

      <Form {...form}>
        <section className="mt-8 md:mt-10">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <InputFormApp
              control={form.control}
              name="email"
              label="Email"
              type="email"
              IconLucide={CircleUser}
              IconColorFill="none"
              IconColor="gray"
              placeholder="Saisissez votre email"
            />
            <InputFormApp
              control={form.control}
              name="password"
              label="Mot de passe"
              type="password"
              IconLucide={KeyRound}
              IconColorFill="none"
              IconColor="gray"
              placeholder="Saisissez votre mot de passe"
            />

            <div className="flex flex-col items-center gap-3">
              <ButtonApp
                type="submit"
                disabled={isLoading}
                isLoading={isCredentialsLoading}
                className="bg-gradient-to-b from-secondary to-primary md:py-7 mt-5"
                title={isCredentialsLoading ? 'Connexion en cours...' : 'Connexion'}
              />
              <Link
                href={routes.public.passwordResetRequest}
                className="inline-flex min-h-11 items-center px-1 text-primary dark:text-primary-200 hover:underline font-medium"
              >
                Mot de passe oublié?
              </Link>
            </div>
          </form>
        </section>

        <div className="flex items-center my-6 md:mt-10">
          <div className="flex-grow h-px bg-gray-300"></div>
          <span className="px-4 py-1 text-primary bg-primary-50 rounded-full text-sm font-medium">OU</span>
          <div className="flex-grow h-px bg-gray-300"></div>
        </div>

        <div className="flex items-center justify-center md:mt-10">
          <Button
            onClick={() => signinWithGoogle()}
            variant="outline"
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 bg-white dark:bg-gray-900 border border-gray-300 rounded-full p-6 text-md font-medium text-gray-800 dark:text-white hover:bg-gray-200 focus:outline-none focus:ring-offset-2 focus:ring-gray-500"
          >
            {isGoogleLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 dark:border-white"></div>
                <span>Connexion en cours...</span>
              </>
            ) : (
              <>
                <svg className="h-6 w-6 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continuer avec Google</span>
              </>
            )}
          </Button>
        </div>
      </Form>

      <div className="mt-6 md:mt-8 text-center px-4">
        <p className="text-base md:text-sm text-gray-500 dark:text-gray-400">
          Vous n&apos;avez pas de compte?{' '}
          <Link
            href={routes.public.signup}
            className="inline-flex min-h-11 items-center px-1 text-primary dark:text-primary-200 hover:underline font-medium"
          >
            S&apos;enregistrer
          </Link>
        </p>
      </div>
    </div>
  );
}
