'use client'

import { useCallback, useEffect, useState } from 'react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useToast } from '@/hooks/use-toast'
import { fetchToken, removeFetchedToken, onForegroundMessage } from '@/firebase/messaging'
import { addFcmToken, removeFcmToken } from '@/db/user.db'
import { createLogger } from '@/lib/logger'

const logger = createLogger('hooks.usePushNotifications')
// Marque locale (par appareil) indiquant que l'utilisateur a explicitement activé les push
// sur CET appareil — chaque device gère son propre opt-in, cohérent avec le support multi-device.
const LOCAL_STORAGE_KEY = 'push_notifications_enabled'

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

export function usePushNotifications() {
    const { user, isFirebaseConnected } = useCurrentUser()
    const { toast } = useToast()
    const [permission, setPermission] = useState<PermissionState>('default')
    const [isEnabled, setIsEnabled] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (typeof window === 'undefined' || typeof Notification === 'undefined') {
            setPermission('unsupported')
            return
        }
        setPermission(Notification.permission)
        setIsEnabled(Notification.permission === 'granted' && localStorage.getItem(LOCAL_STORAGE_KEY) === '1')
    }, [])

    // Réception au premier plan (onglet actif) : le service worker ne reçoit que les messages
    // en arrière-plan, donc sans cet écouteur un utilisateur avec l'app ouverte ne verrait rien.
    useEffect(() => {
        if (!isEnabled) return
        let unsubscribe: (() => void) | undefined
        onForegroundMessage((payload) => {
            const title = payload.notification?.title ?? payload.data?.title ?? 'Trouve Ton Nkama'
            const description = payload.notification?.body ?? payload.data?.message
            toast({ duration: 6000, title, description, variant: 'default' })
        }).then((unsub) => {
            unsubscribe = unsub
        })
        return () => unsubscribe?.()
    }, [isEnabled, toast])

    const enable = useCallback(async () => {
        if (typeof Notification === 'undefined' || !user?.uid || !isFirebaseConnected) return false
        setIsLoading(true)
        try {
            const result = await Notification.requestPermission()
            setPermission(result)
            if (result !== 'granted') {
                if (result === 'denied') {
                    toast({
                        duration: 5000,
                        title: 'Notifications bloquées',
                        description: "Vous avez refusé les notifications. Autorisez-les depuis les réglages de votre navigateur pour les activer.",
                        variant: 'destructive',
                    })
                }
                return false
            }

            const token = await fetchToken()
            if (!token) {
                toast({
                    duration: 5000,
                    title: 'Activation impossible',
                    description: "Impossible d'activer les notifications sur cet appareil pour le moment.",
                    variant: 'destructive',
                })
                return false
            }

            await addFcmToken(user.uid, token)
            localStorage.setItem(LOCAL_STORAGE_KEY, '1')
            setIsEnabled(true)
            toast({
                duration: 4000,
                title: 'Notifications activées',
                description: 'Vous serez notifié sur cet appareil des décisions concernant vos annonces.',
                variant: 'success',
            })
            return true
        } catch (err) {
            logger.error('Failed to enable push notifications', { err })
            return false
        } finally {
            setIsLoading(false)
        }
    }, [user?.uid, isFirebaseConnected, toast])

    const disable = useCallback(async () => {
        if (!user?.uid) return
        setIsLoading(true)
        try {
            const token = await fetchToken()
            if (token) {
                await removeFcmToken(user.uid, token)
            }
            await removeFetchedToken()
            localStorage.removeItem(LOCAL_STORAGE_KEY)
            setIsEnabled(false)
        } catch (err) {
            logger.error('Failed to disable push notifications', { err })
        } finally {
            setIsLoading(false)
        }
    }, [user?.uid])

    return { permission, isEnabled, isLoading, enable, disable }
}
