import { NextResponse } from 'next/server'
import NextAuth from 'next-auth'
import authConfig from './next-auth/auth.config'
import { routes } from './constantes/routes'
import { getPostAuthRedirectPath, hasRole, isAnnouncer } from './lib/auth/role-routing'
import type { Role } from './models/authentication'

const { auth } = NextAuth(authConfig)

const GUEST_ONLY_ROUTES = [
    routes.public.signin,
    routes.public.signup,
    routes.public.signinSignup,
] as const

const PROTECTED_ROUTE_PREFIXES = [
    '/property',
    '/profil',
    '/favoris',
    '/settings',
    '/list-notifications',
    '/my-balance',
    '/login-and-security',
    '/verify-phone',
    '/admin',
] as const

type SessionUser = {
    firstname?: string
    lastname?: string
    phoneNumbers?: string[]
    birthDate?: string
    roles?: Role[] | string[]
    metadata?: Record<string, unknown>
}

const ANNOUNCER_ONLY_ROUTE_PREFIXES = [
    '/property',
] as const

const ADMIN_ONLY_ROUTE_PREFIXES = [
    '/admin',
] as const

function isExactOrSubPath(pathname: string, prefix: string): boolean {
    return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function isProtectedRoute(pathname: string): boolean {
    return PROTECTED_ROUTE_PREFIXES.some((prefix) => isExactOrSubPath(pathname, prefix))
}

function isAnnouncerOnlyRoute(pathname: string): boolean {
    return ANNOUNCER_ONLY_ROUTE_PREFIXES.some((prefix) => isExactOrSubPath(pathname, prefix))
}

function isAdminOnlyRoute(pathname: string): boolean {
    return ADMIN_ONLY_ROUTE_PREFIXES.some((prefix) => isExactOrSubPath(pathname, prefix))
}

function hasCompleteProfile(user: SessionUser | null | undefined): boolean {
    return Boolean(
        user?.firstname &&
        user?.lastname &&
        user?.phoneNumbers?.[0] &&
        user?.birthDate
    )
}

function needsProfileCompletion(user: SessionUser | null | undefined): boolean {
    const metadataFlag = user?.metadata?.needsProfileCompletion === true
    return metadataFlag || !hasCompleteProfile(user)
}

export default auth(async (req) => {
    const { nextUrl } = req
    const pathname = nextUrl.pathname
    const isLoggedIn = Boolean(req.auth?.user)
    const user = req.auth?.user as SessionUser | undefined
    const isGuestOnlyRoute = GUEST_ONLY_ROUTES.includes(pathname as (typeof GUEST_ONLY_ROUTES)[number])
    const isProfileCompletionRoute = pathname === routes.public.completeProfile
    const requiresAuth = isProtectedRoute(pathname)
    const requiresAnnouncerRole = isAnnouncerOnlyRoute(pathname)
    const requiresAdminRole = isAdminOnlyRoute(pathname)
    const userNeedsProfileCompletion = isLoggedIn && needsProfileCompletion(user)
    const postAuthRedirectPath = getPostAuthRedirectPath(user)

    if (!isLoggedIn && (requiresAuth || isProfileCompletionRoute)) {
        const signinUrl = new URL(routes.public.signin, nextUrl)
        signinUrl.searchParams.set('callbackUrl', `${pathname}${nextUrl.search}`)
        return NextResponse.redirect(signinUrl)
    }

    if (userNeedsProfileCompletion && !isProfileCompletionRoute) {
        if (requiresAuth || isGuestOnlyRoute) {
            return NextResponse.redirect(new URL(routes.public.completeProfile, nextUrl))
        }
    }

    if (isLoggedIn && isProfileCompletionRoute && !userNeedsProfileCompletion) {
        return NextResponse.redirect(new URL(postAuthRedirectPath, nextUrl))
    }

    if (isLoggedIn && requiresAnnouncerRole && !isAnnouncer(user)) {
        return NextResponse.redirect(new URL(postAuthRedirectPath, nextUrl))
    }

    if (isLoggedIn && requiresAdminRole && !hasRole(user, 'Admin')) {
        return NextResponse.redirect(new URL(postAuthRedirectPath, nextUrl))
    }

    if (isLoggedIn && isGuestOnlyRoute) {
        return NextResponse.redirect(new URL(postAuthRedirectPath, nextUrl))
    }

    return NextResponse.next()
})

export const config = {
    matcher: ['/', '/((?!api|_next|_vercel|.*\\..*).*)'],
}
