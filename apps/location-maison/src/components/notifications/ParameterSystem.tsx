'use client'
import { useTheme } from 'next-themes'
import React from 'react'
import { Switch } from '../ui/switch'

export default function ParameterSystem() {
    const { setTheme, theme } = useTheme()
    const [loading, setLoading] = React.useState(false)
    const setDarkOrLightMode = async () => {
        setLoading(true)
        setTheme(theme === "dark" ? "light" : "dark")
        setLoading(false)
    }
    return (
        <section aria-labelledby="system-settings-title" className='px-6 space-y-6 py-6 bg-white dark:bg-gray-900 max-w-4xl mx-auto'>
            <h2 id="system-settings-title" className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                Apparence
            </h2>
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
                    aria-label="Activer le mode sombre"
                    onCheckedChange={setDarkOrLightMode}
                    checked={theme === "dark"}
                    disabled={loading}
                />
            </div>
        </section>
    )
}
