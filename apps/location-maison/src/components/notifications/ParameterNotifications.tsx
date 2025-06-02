'use client'
import React from 'react';
import { Switch } from '../ui/switch';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useSession } from 'next-auth/react';
import { updateUser } from '@/db/user.db';

export const notifications = [
    {
        title: 'Nouveautés',
        description: 'Recevez des mises à jour sur les nouvelles fonctionnalités et services.',
        key: 'isNew'
    },
    {
        title: 'Activités du compte',
        description: 'Soyez informé des modifications liées à votre compte, telles que les changements d’e-mail ou de mot de passe.',
        key: 'isAccountActivity'
    },
    {
        title: 'Annonces',
        description: 'Recevez des notifications sur les nouvelles annonces disponibles dans votre région ou vos critères de recherche.',
        key: 'isNewAnnouncement'
    },
    /* {
        title: 'Messages',
        description: 'Recevez des alertes lorsqu’un autre utilisateur vous envoie un message.',
    }, */
    {
        title: 'Favoris',
        description: 'Soyez averti lorsqu’une annonce ajoutée à vos favoris est mise à jour ou supprimée.',
        key: 'isFavoris'
    },
    /* {
        title: 'Promotions',
        description: 'Recevez des offres spéciales et des promotions sur nos services premium.',
    }, */
    {
        title: 'Suggestions personnalisées',
        description: 'Obtenez des recommandations personnalisées basées sur vos recherches récentes.',
        key: 'isPersonalizedSuggestions'
    },
    /* {
        title: 'Rappels',
        description: 'Recevez des rappels sur les visites programmées ou les dates d’expiration de vos annonces.',
    }, */
    /* {
        title: 'Avis et commentaires',
        description: 'Recevez des notifications lorsque vous recevez des avis ou des commentaires sur vos annonces.',
    }, */
    {
        title: 'Mises à jour système',
        description: 'Soyez informé des interruptions de service ou des mises à jour importantes.',
        key: 'isSystemUpdated'
    }
];

export default function ParameterNotifications() {
    const { user } = useCurrentUser();
    const { update } = useSession();
    const [loading, setLoading] = React.useState(false)

    const onCheckedChange = async (param: string) => {
        setLoading(true)
        const userUpdated = {
            ...user,
            notificationParameter: {
                ...user?.notificationParameter,
                [param]: !user?.notificationParameter?.[param]
            }
        };
        await updateUser(user?.uid!, userUpdated);
        update({
            user: {
                ...userUpdated
            }
        });
        setLoading(false)
    };

    return (
        <div className="px-6 space-y-6 py-6 bg-white dark:bg-gray-900 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                Paramètre de notifications
            </h1>
            {notifications.map((notification, key) => (
                <div key={key} className="flex items-center justify-between gap-4 py-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <div className="flex flex-col">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {notification.title}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {notification.description}
                        </p>
                    </div>
                    <Switch
                        onCheckedChange={() => onCheckedChange(notification.key)}
                        checked={user?.notificationParameter ? user.notificationParameter[notification.key] : false}
                        disabled={loading}
                    />
                </div>
            ))}
        </div>
    );
}
