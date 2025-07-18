'use client'
import React from 'react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { routes } from '@/constantes/routes'
import Link from 'next/link'
import { Phone, X } from 'lucide-react'
import { useState } from 'react'
import { usePathname } from 'next/navigation'

// Temporairement caché - Problèmes de vérification téléphonique
export default function PhoneVerificationBanner() {
    // Retourner null pour cacher complètement la bannière
    return null;
    
    /*
    const { user } = useCurrentUser()
    const pathname = usePathname()
    const [isVisible, setIsVisible] = useState(true)

    // Ne pas afficher si l'utilisateur n'est pas connecté
    if (!user) return null

    // Ne pas afficher si le numéro est déjà vérifié
    if (user.phoneNumberVerified) return null

    // Ne pas afficher si l'utilisateur n'a pas de numéro de téléphone
    if (!user.phoneNumbers?.[0]) return null

    // Ne pas afficher si la bannière a été fermée
    if (!isVisible) return null

    // Ne pas afficher sur les pages publiques
    const isProtectedRoute = Object.values(routes.protected).some(route => 
        pathname.startsWith(route)
    )
    if (!isProtectedRoute) return null

    return (
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-l-4 border-orange-400 p-3 mb-4 rounded-r-lg shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                        <Phone className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-orange-800 font-medium">
                            Vérifiez votre numéro de téléphone
                        </p>
                        <p className="text-xs text-orange-700 mt-1">
                            Sécurisez votre compte en vérifiant votre numéro
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href={routes.protected.verify_phone}
                        className="text-xs bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded-md transition-colors duration-200"
                    >
                        Vérifier
                    </Link>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="text-orange-600 hover:text-orange-800 transition-colors duration-200"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
    */
} 