import React from "react";
import Logo from '@trouve-ton-nkama/ui/logo';
import Link from "next/link";
import { routes } from "@/constantes/routes";
import { signInWithGoogle } from "@/actions/signin-with-google";
import { ButtonLoading } from "../buttons/ButtonLoading";
import connectionMethods from "@/constantes/connections-methods";
import { signInWithFacebook } from "@/actions/signin-with-facebook";

type LayoutAuthProps = React.PropsWithChildren & {
    type: "Signin" | "Signup" | "CompleteProfile";
    setIsOtherMethodConnection: React.Dispatch<React.SetStateAction<boolean>>;
    isFormLoading?: boolean; // Nouvel état pour désactiver les boutons pendant l'inscription
};

export const LayoutAuth: React.FC<LayoutAuthProps> = ({ 
    children, 
    type, 
    setIsOtherMethodConnection,
    isFormLoading = false
}) => {
    const [isPending, startTransition] = React.useTransition()
    const handleConnection = (method: 'FACEBOOK' | 'GOOGLE') => {
        switch (method) {
            case 'GOOGLE':
                startTransition(() => {
                    signInWithGoogle();
                })
                break;
            case 'FACEBOOK':
                startTransition(() => {
                    signInWithFacebook();
                })
                break;
            default:
                break;
        }
    }
    React.useEffect(() => {
        setIsOtherMethodConnection(isPending)
    }, [isPending])
    
    // Désactiver les boutons si l'inscription est en cours OU si les boutons sociaux sont en cours
    const buttonsDisabled = isPending || isFormLoading;
    
    return (
        <div className={`min-h-screen bg-gray-100 dark:bg-gray-900 flex justify-center items-center py-5 ${type === "CompleteProfile" ? "pb-20 md:pb-5" : ""}`}>
            {/* Container */}
            <div className="w-full max-w-4xl mx-4 bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50 rounded-lg flex flex-col md:flex-row overflow-hidden">
                {/* Left Side: Branding/Message */}
                <div className="hidden md:block md:w-1/2 bg-gradient-to-br from-primary via-secondary to-primary text-white p-8">
                    <div className="flex flex-col h-full">
                        <div className="flex items-center">
                            <Link href={routes.public.homePage}>
                                <Logo width="64px" height="64px" />
                            </Link>
                            <h1 className="text-2xl font-bold">
                                Trouve Ton Nkama
                            </h1>
                        </div>

                        <p className="mt-4 text-lg">
                        Trouvez facilement votre maison, appartement, terrain ou local commercial grâce à notre plateforme intuitive.
                        </p>
                    </div>
                </div>

                {/* Right Side: Form/Card */}
                <div className="w-full md:w-1/2 flex flex-col justify-center p-6 sm:p-10">
                    {/* Card Content */}
                    <div className="w-full max-w-md mx-auto">
                        <h1 className="relative text-center text-2xl md:text-3xl font-bold mb-8">
                            <span className="bg-gradient-to-r from-primary via-secondary to-primary text-transparent bg-clip-text">
                                {type === "Signin" ? "Connexion" : type === "Signup" ? "Créer un compte" : "Compléter votre profil"}
                            </span>
                            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-12 h-1 rounded-full bg-gradient-to-r from-primary via-secondary to-primary" />
                        </h1>
                        <div>{children}</div>
                        {type !== "CompleteProfile" && (
                            <div className="mt-6 flex flex-col items-center">
                                <span className="text-sm text-gray-500 dark:text-gray-400 mb-2">Ou connectez-vous avec</span>
                                <div className="flex gap-4">
                                    {connectionMethods.map((connection) => (
                                        <ButtonLoading
                                            key={connection.method}
                                            type="button"
                                            className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition duration-200"
                                            onClick={() => handleConnection(connection.method)}
                                            disabled={buttonsDisabled}
                                            colorSpinner="blue"
                                        >
                                            <connection.icon size={24} color={connection?.colorIcon} />
                                        </ButtonLoading>
                                    ))}
                                </div>
                            </div>
                        )}
                        {type !== "CompleteProfile" && (
                            <div className="mt-6 text-center">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {type === "Signin"
                                        ? "Vous n'avez pas de compte?"
                                        : "Vous avez déjà un compte?"}{" "}
                                    <Link
                                        href={type === "Signup" ? routes.public.signin : routes.public.signup}
                                        className="text-blue-500 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                                    >
                                        {type === "Signup" ? "Se connecter" : "S'enregistrer"}
                                    </Link>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};