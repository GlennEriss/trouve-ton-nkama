'use client'
import React from 'react'
import { ChevronLeft, CircleUser, KeyRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { FormLoginSchema, FormLoginSchemaType } from '@/models/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '../ui/form';
import { InputFormApp } from '../shared/form/InputFormApp';
import { ButtonApp } from '../shared/ui/ButtonApp';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { routes } from '@/constantes/routes';
import { useToast } from '@/hooks/use-toast';
import { signIn } from "next-auth/react"
import { Button } from '../ui/button';
import { useRouter, useSearchParams } from 'next/navigation';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400'],
})

export default function SigninMobileComponent() {
  const router = useRouter()
  const searchParams = useSearchParams();
  const { toast } = useToast()
  const [isOtherMethodConnection, setIsOtherMethodConnection] = React.useState(false)

  const form = useForm<FormLoginSchemaType>({
    resolver: zodResolver(FormLoginSchema)
  })
  const handleSigninWithGoogle = async () => {
    setIsOtherMethodConnection(true)
    await signIn('google')
    setIsOtherMethodConnection(false)
  }
  const onSubmit = async (values: FormLoginSchemaType) => {
    const validateFields = FormLoginSchema.safeParse(values)
    if (!validateFields.success) {
      return toast({
        duration: 5000,
        title: 'Erreur de connexion',
        description: "Email ou mot de passe incorrect!",
        variant: 'destructive',
      });
    }
    const user = {
      login: validateFields.data.email,
      password: validateFields.data.password
    }
    try {
      const result = await signIn('credentials', {
        ...user,
        redirect: false
      })
      if (!result?.ok || result?.error !== null) {
        return toast({
          duration: 5000,
          title: 'Erreur de connexion',
          description: "Email ou mot de passe incorrect!",
          variant: 'destructive',
        });
      }
      toast({
        duration: 5000,
        title: 'Connexion réussie',
        description: "Vous vous êtes connectés avec succès!",
        variant: 'success',
      });
      return router.push(routes.protected.properties)
    } catch (error) {
      console.error('Authentication Error:', error);
      return toast({
        duration: 5000,
        title: 'Erreur de connexion',
        description: "Email ou mot de passe incorrect!",
        variant: 'destructive',
      });
    }
  }

  React.useEffect(() => {
    const error = searchParams.get("error");
    if (error === "wrong_provider") {
      toast({
        duration: 5000,
        title: "Erreur de connexion",
        description: "Ce compte est associé à un autre mode de connexion.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);
  return (
    <div className={cn('p-4 md:p-20', inter.className)}>
      <div>
        <Link href={routes.public.signinSignup}>
          <ChevronLeft color='gray' size={30} />
        </Link>
      </div>

      <section className='mt-8 md:mt-10'>
        <h1 className='text-2xl font-bold text-[#187872]'>Bienvenue sur Trouve Ton Nkama !</h1>
        <p className='text-gray-500'>
          Trouvez facilement votre logement de rêve grâce à notre plateforme.
        </p>
      </section>
      <Form {...form}>
        <section className='mt-8 md:mt-10'>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <InputFormApp
              control={form.control}
              name='email'
              label='Email'
              type='email'
              IconLucide={CircleUser}
              IconColorFill={'none'}
              IconColor='gray'
              placeholder='Saisissez votre email'
            />
            <InputFormApp
              control={form.control}
              name='password'
              label='Mot de passe'
              type='password'
              IconLucide={KeyRound}
              IconColorFill='none'
              IconColor='gray'
              placeholder='Saisissez votre mot de passe'
            />
            <div className='flex flex-col items-center gap-3'>
              <ButtonApp
                type='submit'
                disabled={Boolean(form.formState.isSubmitting) || Boolean(form.formState.isLoading) || Boolean(isOtherMethodConnection)}
                isLoading={Boolean(form.formState.isSubmitting) || Boolean(form.formState.isLoading) || Boolean(isOtherMethodConnection)}
                className='bg-gradient-to-b from-[#1FA89B] to-[#146B67] md:py-7 mt-5'
                title='Connexion'
              />
              <Link href={routes.public.reset_password} className='text-gray-500'>
                Mot de passe oublié?
              </Link>
            </div>
          </form>
        </section>

        <div className="flex items-center my-6 md:mt-10">
          <div className="flex-grow h-px bg-gray-300"></div>
          <span className="px-4 py-1 text-[#146B67] bg-[#e7f5f4] rounded-full text-sm font-medium">OU</span>
          <div className="flex-grow h-px bg-gray-300"></div>
        </div>

        <div className="flex items-center justify-center md:mt-10">
          <Button
            onClick={handleSigninWithGoogle}
            variant='outline'
            disabled={Boolean(form.formState.isSubmitting) || Boolean(form.formState.isLoading) || Boolean(isOtherMethodConnection)}
            className="w-full flex justify-center items-center gap-2 bg-white dark:bg-gray-900 border border-gray-300 rounded-full p-6 text-md font-medium text-gray-800 dark:text-white hover:bg-gray-200 focus:outline-none focus:ring-offset-2 focus:ring-gray-500">
            <svg className="h-6 w-6 mr-2" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" width="800px" height="800px" viewBox="-0.5 0 48 48" version="1.1"> <title>Google-color</title> <desc>Created with Sketch.</desc> <defs> </defs> <g id="Icons" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd"> <g id="Color-" transform="translate(-401.000000, -860.000000)"> <g id="Google" transform="translate(401.000000, 860.000000)"> <path d="M9.82727273,24 C9.82727273,22.4757333 10.0804318,21.0144 10.5322727,19.6437333 L2.62345455,13.6042667 C1.08206818,16.7338667 0.213636364,20.2602667 0.213636364,24 C0.213636364,27.7365333 1.081,31.2608 2.62025,34.3882667 L10.5247955,28.3370667 C10.0772273,26.9728 9.82727273,25.5168 9.82727273,24" id="Fill-1" fill="#FBBC05"> </path> <path d="M23.7136364,10.1333333 C27.025,10.1333333 30.0159091,11.3066667 32.3659091,13.2266667 L39.2022727,6.4 C35.0363636,2.77333333 29.6954545,0.533333333 23.7136364,0.533333333 C14.4268636,0.533333333 6.44540909,5.84426667 2.62345455,13.6042667 L10.5322727,19.6437333 C12.3545909,14.112 17.5491591,10.1333333 23.7136364,10.1333333" id="Fill-2" fill="#EB4335"> </path> <path d="M23.7136364,37.8666667 C17.5491591,37.8666667 12.3545909,33.888 10.5322727,28.3562667 L2.62345455,34.3946667 C6.44540909,42.1557333 14.4268636,47.4666667 23.7136364,47.4666667 C29.4455,47.4666667 34.9177955,45.4314667 39.0249545,41.6181333 L31.5177727,35.8144 C29.3995682,37.1488 26.7323182,37.8666667 23.7136364,37.8666667" id="Fill-3" fill="#34A853"> </path> <path d="M46.1454545,24 C46.1454545,22.6133333 45.9318182,21.12 45.6113636,19.7333333 L23.7136364,19.7333333 L23.7136364,28.8 L36.3181818,28.8 C35.6879545,31.8912 33.9724545,34.2677333 31.5177727,35.8144 L39.0249545,41.6181333 C43.3393409,37.6138667 46.1454545,31.6490667 46.1454545,24" id="Fill-4" fill="#4285F4"> </path> </g> </g> </g> </svg>
            <span>Continuer avec Google</span>
          </Button>
        </div>
      </Form>
    </div>
  )
}
