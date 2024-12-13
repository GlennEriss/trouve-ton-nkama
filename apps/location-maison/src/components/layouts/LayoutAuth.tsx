import React from "react";
import Logo from "../logo/Logo";
import Image from "next/image";
import { Button } from "../ui/button";
import { FaFacebookF } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import Link from "next/link";

const connectionMethods = [
    {
        icon: FcGoogle,
        method: 'GOOGLE'
    },
    {
        icon: FaFacebookF,
        method: 'GOOGLE'
    },
] as const

type LayoutAuthProps = React.PropsWithChildren & {
    type: 'Signin' | 'Signup'
}

export const LayoutAuth: React.FC<LayoutAuthProps> = ({ children, type }) => {
    return (
        <div className="w-full min-h-screen">
            <div className="hidden lg:block w-1/2 h-full relative">
                <div className="absolute w-full h-screen">
                    <Image
                        src='/assets/img-city.jpg'
                        alt="city"
                        fill
                    />
                </div>
            </div>
            <div className="lg:w-1/2 lg:ml-auto lg:p-20 flex flex-col gap-4 p-5">
                <Logo />
                <h1>Bienvenue sur Home-Rent, la plateforme pour facilité vos recherches de logements</h1>
                {children}
                <div className="flex gap-3 justify-center">
                    {
                        connectionMethods.map((connection: typeof connectionMethods[number], key) => (
                            <button
                                key={key}
                                type="button"
                                className="rounded-full flex items-center justify-center w-14 h-14 border"
                            >
                                <connection.icon size={25} color="blue" />
                            </button>
                        ))
                    }
                </div>
                <div className="flex items-center justify-center gap-2">
                    <span>{type === 'Signup' ? "Vous n'avez pas de compte?" : "Vous avez déjà un compte?"}</span>
                    <Link href={''}>
                        {type === 'Signup' ? "Se connecter" : "S'enregistrer"}
                    </Link>
                </div>
            </div>
        </div>
    )
}