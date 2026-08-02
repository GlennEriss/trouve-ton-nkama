'use client'

import React from 'react'
import DataDeletionMobilePage from "@/components/data-deletion/DataDeletionMobilePage";
import { routes } from "@/constantes/routes";
import { useWindowSize } from "@/hooks/useSize";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Mail } from "lucide-react";

export default function DataDeletionClientPage() {
    const size = useWindowSize()
    if (size.width < 768) {
        return <DataDeletionMobilePage />
    }
    return (
        <div className="min-h-screen bg-gray-50 relative overflow-hidden">
            {/* Image de fond */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10">
                <div className="relative w-full h-full">
                    <Image
                        src="/assets/privacy-policy/terms-of-use-img.webp"
                        alt="Background"
                        width={400}
                        height={400}
                        className="absolute top-20 -left-20 transform rotate-[-15deg]"
                    />
                    <Image
                        src="/assets/privacy-policy/terms-of-use-img.webp"
                        alt="Background"
                        width={400}
                        height={400}
                        className="absolute top-20 -right-20 transform rotate-15 scale-x-[-1]"
                    />
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-16 relative">
                {/* En-tête */}
                <div className="text-center mb-12 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-primary text-transparent bg-clip-text">
                        Suppression des Données
                    </h1>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                        Nous respectons votre droit à la confidentialité et à la suppression de vos données
                    </p>
                </div>

                <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
                    <CardContent className="p-8">
                        {/* Section d'avertissement */}
                        <div className="bg-yellow-50/50 border border-yellow-200 rounded-lg p-4 mb-8">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-6 h-6 text-yellow-600 mt-1" />
                                <div>
                                    <h2 className="text-lg font-semibold text-yellow-800 mb-2">
                                        Important à savoir
                                    </h2>
                                    <p className="text-yellow-700">
                                        La suppression de vos données est irréversible. Une fois supprimées, nous ne pourrons pas restaurer vos informations.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Contenu principal */}
                        <div className="space-y-6">
                            <p className="text-gray-700 text-lg leading-relaxed">
                                Conformément à la politique de protection des données, vous avez le droit de demander la suppression de vos données personnelles associées à votre compte.
                            </p>

                            {/* Section de contact */}
                            <div className="bg-gray-50/50 rounded-lg p-6 border border-gray-100">
                                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                                    Comment demander la suppression ?
                                </h3>
                                <div className="flex items-start gap-4">
                                    <div className="bg-primary rounded-full p-3">
                                        <Mail className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-gray-700 mb-2">
                                            Envoyez votre demande par email à :
                                        </p>
                                        <a
                                            href={`mailto:${process.env.NEXT_PUBLIC_EMAIL_SUPPORT}`}
                                            className="text-primary font-medium hover:text-secondary transition-colors"
                                        >
                                            {process.env.NEXT_PUBLIC_EMAIL_SUPPORT}
                                        </a>
                                        <p className="text-gray-600 mt-2 text-sm">
                                            Objet : "Suppression de compte"
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-gray-700">
                                    Une fois votre demande reçue, nous traiterons la suppression de vos données dans un délai de 30 jours, conformément à nos conditions d'utilisation et notre politique de confidentialité.
                                </p>
                                <p className="text-gray-700">
                                    Pour plus d'informations, consultez notre{" "}
                                    <a 
                                        href={routes.public.confidentiality}
                                        className="text-primary hover:text-secondary transition-colors underline"
                                    >
                                        Politique de Confidentialité
                                    </a>.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
