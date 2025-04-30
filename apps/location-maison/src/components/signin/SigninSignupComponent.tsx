'use client'
import { routes } from '@/constantes/routes'
import { useWindowSize } from '@/hooks/useSize'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import Image from 'next/image'
import { ButtonApp } from '../shared/ui/ButtonApp'
import { Inter } from 'next/font/google'
import { cn } from '@/lib/utils'
import Link from 'next/link';

const inter = Inter({
    subsets: ['latin'],
    weight: ['400'],
})

export default function SigninSignupComponent() {
    const size = useWindowSize()
    const router = useRouter()
    const [isImageLoaded, setIsImageLoaded] = useState(false)
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
        <div className={cn('relative', inter.className)}>
            <section className="max-h-[510px] md:max-h-[700px]">
                <Image
                    src="/assets/auth/welcome-mobile-img.png"
                    alt="Bienvenue sur LogisGabon"
                    width={400}
                    height={400}
                    className="w-full max-w-[400px] md:max-w-[600px] h-auto mx-auto"
                    style={{ objectFit: 'contain' }}
                    onLoad={() => setIsImageLoaded(true)}
                />
            </section>
            {isImageLoaded && (
                <section className={`absolute left-1/2 transform -translate-x-1/2 ${size.height > 740 ? '':'bottom-[-150px]'} md:bottom-[-270px] rounded-lg w-[90%] max-w-[400px] md:max-w-[600px] flex flex-col gap-8 transition-opacity duration-700 opacity-100`}>
                    <div>
                        <h1 className='text-xl font-bold text-center md:text-4xl text-[#146b66] dark:text-[#3ebeb8]'>Nouveau lieu, nouvelle maison !</h1>
                        <p className={cn('text-center text-md text-gray-500 flex flex-col md:text-xl', `${size.height < 700 ? 'dark:text-[#277874]':''}`)}>
                            <span>LogisGabon, votre nouveau départ.</span>
                            <span>Trouvez votre futur logement dès aujourd'hui.</span>
                        </p>
                    </div>
                    <div className='space-y-3'>
                        <ButtonApp
                            title={'Se connecter'}
                            className='bg-gradient-to-b from-[#1FA89B] to-[#146B67] md:text-xl md:py-7'
                            onClick={handleGoToSignin}
                        />
                        <ButtonApp
                            variant='outline'
                            title={"S'enregistrer"}
                            className='bg-white dark:bg-gray-900 border border-gray-400 dark:border-gray-600 text-black dark:text-white md:text-xl md:py-7 hover:bg-none'
                            onClick={handleGoToSignup}
                        />
                        <div className="text-center">
                            <Link href={routes.public.homePage} className="text-sm text-gray-500 dark:text-gray-400 hover:underline">
                                Revenir à l'accueil
                            </Link>
                        </div>
                    </div>
                </section>
            )}
        </div>
    )
}
