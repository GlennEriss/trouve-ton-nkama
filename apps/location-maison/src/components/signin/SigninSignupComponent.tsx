'use client'
import { routes } from '@/constantes/routes'
import { useWindowSize } from '@/hooks/useSize'
import { useRouter } from 'next/navigation'
import React from 'react'
import Image from 'next/image'
import { ButtonApp } from '../shared/ButtonApp'
import { Inter } from 'next/font/google'
import { cn } from '@/lib/utils'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400'],
})

export default function SigninSignupComponent() {
    const size = useWindowSize()
    const router = useRouter()
    const handleGoToSignin = () => {
        router.push(routes.public.signin)
    }
    const handleGoToSignup = () => {
        router.push(routes.public.signup)
    }
    if (size.width > 768) {
        router.push(routes.public.signin)
    }
    return (
        <div className={cn('relative',inter.className)}>
            <section className="max-h-[510px] md:max-h-[700px]">
                <Image
                    src="/assets/auth/welcome-mobile-img.png"
                    alt="Bienvenue sur LogisGabon"
                    width={400}
                    height={400}
                    className="w-full max-w-[400px] md:max-w-[600px] h-auto mx-auto"
                    style={{ objectFit: 'contain' }}
                />
            </section>
            <section className="absolute left-1/2 transform -translate-x-1/2 bottom-[-120px] md:bottom-[-270px] rounded-lg w-[90%] max-w-[400px] md:max-w-[600px] flex flex-col gap-8">
                <div>
                    <h1 className='text-xl font-bold text-center md:text-4xl'>Nouveau lieu, nouvelle maison !</h1>
                    <p className='text-center text-md text-gray-500 flex flex-col md:text-xl'>
                        <span>LogisGabon, votre nouveau départ.</span>
                        <span>Trouvez votre futur logement dès aujourd'hui.</span>
                    </p>
                </div>

                <div className='space-y-3'>
                    <ButtonApp
                        title={'Se connecter'}
                        className='bg-gradient-to-b from-[#1FA89B] to-[#146B67] md:text-xl md:py-7'
                        onClick={() => handleGoToSignin()}
                    />
                    <ButtonApp
                        title={"S'enregistrer"}
                        className='bg-white border border-gray-400 text-black md:text-xl md:py-7'
                        onClick={() => handleGoToSignup()}
                    />
                </div>
            </section>
        </div>
    )
}
