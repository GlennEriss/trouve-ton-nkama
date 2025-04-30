'use client'
import { useTheme } from 'next-themes'
import React from 'react'
import { Switch } from '../ui/switch'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useSession } from 'next-auth/react'
import { updateUser } from '@/db/user.db'

export default function ParameterSystem() {
    const { setTheme } = useTheme()
    const { user } = useCurrentUser()
    const { update } = useSession();
    const [loading, setLoading] = React.useState(false)
    const setDarkOrLightMode = async () => {
        setLoading(true)
        const darkMode = !user?.darkMode
        setTheme(darkMode ? "dark" : "light")
        const userUpdated = {
            ...user,
            darkMode
        }
        //await updateUser(user?.uid!, userUpdated);
        update({
            user: {
                ...userUpdated
            }
        });
        setLoading(false)
    }
    return (
        <div className='px-6 space-y-6 py-6 bg-white dark:bg-gray-900 max-w-4xl mx-auto'>
            <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                Paramètre du système
            </h1>
            <div className="flex items-center justify-between gap-4 py-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                <div className="flex flex-col">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Mode sombre
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Activer ou désactiver le mode sombre
                    </p>
                </div>
                <Switch
                    onCheckedChange={setDarkOrLightMode}
                    checked={user?.darkMode}
                    disabled={loading}
                />
            </div>
        </div>
    )
}
