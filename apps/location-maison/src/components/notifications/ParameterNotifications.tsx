'use client'
import React from 'react';
import { Switch } from '@trouve-ton-nkama/ui/switch';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useSession } from 'next-auth/react';
import { updateUser } from '@/db/user.db';

export const notifications = [
    {
        title: 'Nouveautes',
        description: 'Recevez des mises a jour sur les nouvelles fonctionnalites et services.',
        key: 'isNew'
    },
    {
        title: 'Activites du compte',
        description: 'Soyez informe des modifications liees a votre compte, telles que les changements d\'email ou de mot de passe.',
        key: 'isAccountActivity'
    },
    {
        title: 'Annonces',
        description: 'Recevez des notifications sur les nouvelles annonces disponibles dans votre region ou vos criteres de recherche.',
        key: 'isNewAnnouncement'
    },
    /* {
        title: 'Messages',
        description: 'Recevez des alertes lorsqu\'un autre utilisateur vous envoie un message.',
    }, */
    {
        title: 'Favoris',
        description: 'Soyez averti lorsqu\'une annonce ajoutee a vos favoris est mise a jour ou supprimee.',
        key: 'isFavoris'
    },
    /* {
        title: 'Promotions',
        description: 'Recevez des offres speciales et des promotions sur nos services premium.',
    }, */
    {
        title: 'Suggestions personnalisees',
        description: 'Obtenez des recommandations personnalisees basees sur vos recherches recentes.',
        key: 'isPersonalizedSuggestions'
    },
    /* {
        title: 'Rappels',
        description: 'Recevez des rappels sur les visites programmees ou les dates d\'expiration de vos annonces.',
    }, */
    /* {
        title: 'Avis et commentaires',
        description: 'Recevez des notifications lorsque vous recevez des avis ou des commentaires sur vos annonces.',
    }, */
    {
        title: 'Mises a jour systeme',
        description: 'Soyez informe des interruptions de service ou des mises a jour importantes.',
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
        await updateUser(user?.uid, userUpdated);
        update({
            user: {
                ...userUpdated
            }
        });
        setLoading(false)
    };

    return (
        <section aria-labelledby="notification-settings-title" className="px-6 space-y-6 py-6 bg-white dark:bg-gray-900 max-w-4xl mx-auto">
            <h2 id="notification-settings-title" className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                Notifications
            </h2>
            {notifications.map((notification) => (
                <div key={notification.key} className="flex items-center justify-between gap-4 py-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <div className="flex flex-col">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {notification.title}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {notification.description}
                        </p>
                    </div>
                    <Switch
                        aria-label={`Recevoir les notifications : ${notification.title}`}
                        onCheckedChange={() => onCheckedChange(notification.key)}
                        checked={user?.notificationParameter ? user.notificationParameter[notification.key] : false}
                        disabled={loading}
                    />
                </div>
            ))}
        </section>
    );
}
