'use client'
import { routes } from '@/constantes/routes'
import { useWindowSize } from '@/hooks/useSize'
import { useRouter } from 'next/navigation'
import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { ButtonApp } from '../shared/ui/ButtonApp'
import { Inter } from 'next/font/google'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/use-current-user'

const inter = Inter({
    subsets: ['latin'],
    weight: ['400'],
})

export default function SigninSignupComponent() {
    const size = useWindowSize()
    const router = useRouter()
    const { user } = useCurrentUser()
    const [isImageLoaded, setIsImageLoaded] = useState(false)
    const [isVisible, setIsVisible] = useState(false)
    
    const handleGoToSignin = () => {
        router.push(routes.public.signin)
    }
    const handleGoToSignup = () => {
        router.push(routes.public.signup)
    }
    useEffect(() => {
        if (isImageLoaded) {
            setTimeout(() => setIsVisible(true), 100)
        }
    }, [isImageLoaded]);
    if (user) {
        return null
    }
    return (
        <div className={cn('relative min-h-screen flex flex-col items-center justify-center', inter.className)}>
            <section className="w-full max-w-[400px] md:max-w-[600px] transition-opacity duration-500 ease-in-out">
                <Image
                    src="/assets/auth/welcome-mobile-img.png"
                    alt="Bienvenue sur LogisGabon"
                    width={400}
                    height={400}
                    className="w-full h-auto mx-auto transition-all duration-500 ease-in-out transform"
                    style={{ objectFit: 'contain' }}
                    onLoad={() => setIsImageLoaded(true)}
                    priority
                />
            </section>
            {isImageLoaded && (
                <section className={cn(
                    'w-[90%] max-w-[400px] md:max-w-[600px] flex flex-col gap-8 transition-all duration-700 ease-in-out',
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
                    size.height > 740 ? 'mt-8' : 'absolute bottom-[-190px] md:bottom-[-270px]'
                )}>
                    <div className="space-y-4">
                        <h1 className='text-xl font-bold text-center md:text-4xl text-[#146b66] dark:text-[#3ebeb8] transition-colors duration-300'>
                            Nouveau lieu, nouvelle maison !
                        </h1>
                        <p className={cn(
                            'text-center text-md text-gray-500 flex flex-col md:text-xl transition-colors duration-300',
                            size.height < 700 ? 'dark:text-[#277874]' : ''
                        )}>
                            <span>LogisGabon, votre nouveau départ.</span>
                            <span>Trouvez votre futur logement dès aujourd'hui.</span>
                        </p>
                    </div>
                    <div className='space-y-3'>
                        <ButtonApp
                            title={'Se connecter'}
                            className='bg-gradient-to-b from-[#1FA89B] to-[#146B67] md:text-xl md:py-7 transition-all duration-300 hover:scale-105'
                            onClick={handleGoToSignin}
                        />
                        <ButtonApp
                            variant='outline'
                            title={"S'enregistrer"}
                            className='bg-white dark:bg-gray-900 border border-gray-400 dark:border-gray-600 text-black dark:text-white md:text-xl md:py-7 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 hover:scale-105'
                            onClick={handleGoToSignup}
                        />
                        <div className="text-center">
                            <Link 
                                href={routes.public.homePage} 
                                className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#146B67] dark:hover:text-[#1FA89B] transition-colors duration-300"
                            >
                                Revenir à l'accueil
                            </Link>
                        </div>
                    </div>
                </section>
            )}
        </div>
    )
}
