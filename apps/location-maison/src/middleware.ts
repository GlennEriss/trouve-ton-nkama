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
    //const isPublicRoute = Object.values(routes.public).includes(nextUrl.pathname)
    const isProtectedRoute = Object.values(routes.protected).includes(nextUrl.pathname)

    if (isLoggedIn && isAuthRoute) {
        return NextResponse.redirect(new URL(routes.protected.properties, nextUrl))
    }
    if (!isLoggedIn && isProtectedRoute) {
        return NextResponse.redirect(new URL(routes.public.signin, nextUrl))
    }

    return NextResponse.next()
})

export const config = {
    matcher: ['/', '/((?!api|_next|_vercel|.*\\..*).*)'],
}