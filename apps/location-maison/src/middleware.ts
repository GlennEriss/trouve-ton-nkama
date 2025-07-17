import { NextResponse } from 'next/server'
import NextAuth from 'next-auth'
import authConfig from './next-auth/auth.config'
import { routes } from './constantes/routes'

const { auth } = NextAuth(authConfig)

export default auth(async (req) => {
    const { nextUrl } = req
    const isLoggedIn = !!req.auth
    const authRoute = [routes.public.signin, routes.public.signup]
    const isAuthRoute = authRoute.includes(nextUrl.pathname)
    const isCompleteProfileRoute = nextUrl.pathname === routes.public.completeProfile
    const isProtectedRoute = Object.values(routes.protected).includes(nextUrl.pathname)

    if (isLoggedIn && isAuthRoute) {
        return NextResponse.redirect(new URL(routes.protected.properties, nextUrl))
    }
    
    if (!isLoggedIn && isProtectedRoute) {
        return NextResponse.redirect(new URL(routes.public.homePage, nextUrl))
    }

    // Rediriger vers la page de complétion si l'utilisateur a besoin de compléter son profil
    if (isLoggedIn && !isCompleteProfileRoute) {
        const user = req.auth?.user as any
        
        // Vérifier si l'utilisateur a toutes les informations requises
        const hasCompleteInfo = user?.firstname && 
                               user?.lastname && 
                               user?.phoneNumbers?.[0] && 
                               user?.birthDate;
        
        // Si l'utilisateur n'a pas toutes les infos, le bloquer sur la page de complétion
        if (!hasCompleteInfo) {
            // Permettre l'accès à la page de complétion et aux pages publiques
            if (isProtectedRoute || isAuthRoute) {
                return NextResponse.redirect(new URL(routes.public.completeProfile, nextUrl))
            }
        }
    }

    return NextResponse.next()
})

export const config = {
    matcher: ['/', '/((?!api|_next|_vercel|.*\\..*).*)'],
}