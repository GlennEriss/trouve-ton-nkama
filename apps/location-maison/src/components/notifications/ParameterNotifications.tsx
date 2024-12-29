import React from 'react';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';

export const notifications = [
    {
        title: 'Nouveautés',
        description: 'Recevez des mises à jour sur les nouvelles fonctionnalités et services.',
    },
    {
        title: 'Activités du compte',
        description: 'Soyez informé des modifications liées à votre compte, telles que les changements d’e-mail ou de mot de passe.',
    },
    {
        title: 'Annonces',
        description: 'Recevez des notifications sur les nouvelles annonces disponibles dans votre région ou vos critères de recherche.',
    },
    {
        title: 'Messages',
        description: 'Recevez des alertes lorsqu’un autre utilisateur vous envoie un message.',
    },
    {
        title: 'Favoris',
        description: 'Soyez averti lorsqu’une annonce ajoutée à vos favoris est mise à jour ou supprimée.',
    },
    {
        title: 'Promotions',
        description: 'Recevez des offres spéciales et des promotions sur nos services premium.',
    },
    {
        title: 'Suggestions personnalisées',
        description: 'Obtenez des recommandations personnalisées basées sur vos recherches récentes.',
    },
    {
        title: 'Rappels',
        description: 'Recevez des rappels sur les visites programmées ou les dates d’expiration de vos annonces.',
    },
    {
        title: 'Avis et commentaires',
        description: 'Recevez des notifications lorsque vous recevez des avis ou des commentaires sur vos annonces.',
    },
    {
        title: 'Mises à jour système',
        description: 'Soyez informé des interruptions de service ou des mises à jour importantes.',
    }
];

export default function ParameterNotifications() {
    return (
        <div className='px-6 space-y-6 py-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto'>
            <h1 className='text-2xl font-bold mb-4'>Paramètres de notifications</h1>
            {
                notifications.map((notification, key) => (
                    <div key={key} className='flex items-center justify-between gap-4 py-4 border-b last:border-b-0'>
                        <div className="flex flex-col">
                            <h2 className='text-lg font-semibold'>{notification.title}</h2>
                            <p className='text-sm text-gray-500'>{notification.description}</p>
                        </div>
                        <Switch />
                    </div>
                ))
            }
        </div>
    );
}
