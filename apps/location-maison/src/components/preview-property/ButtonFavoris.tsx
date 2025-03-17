'use client'
import React from 'react'
import { Heart } from "lucide-react";
import clsx from 'clsx';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useSession } from 'next-auth/react';
import { updateUser } from '@/db/user.db';
import { getPropertyById } from '@/db/property.db';
import { createNotification } from '@/db/notification.db';
import { Notification } from '@/models/notification'
import { routes } from '@/constantes/routes';
type ButtonFavorisProps = {
  idProperty: string
}

export const ButtonFavoris: React.FC<ButtonFavorisProps> = ({ idProperty }) => {
  const user = useCurrentUser()
  const { update } = useSession()
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const toggleFavorite = async () => {
    if (isLoading) return; // Empêche plusieurs clics
    setIsLoading(true);

    const addInFavorite = !isFavorite;
    setIsFavorite(addInFavorite);

    // On crée une copie du tableau favoris pour éviter les mutations directes
    const favoris = user?.favoris ? [...user.favoris] : [];

    if (addInFavorite) {
      const property = await getPropertyById(idProperty)
      if (property) {
        favoris.push(idProperty);
        let notification: Partial<Notification> = {
          type: 'BOOKMARKING',
          idProperty,
          title: property.title,
          isRead: false,
          createdFor: property.createdBy,
        }
        if(user?.uid === property.createdBy){
          notification.message = 'Une annonce a été ajoutée a vos favoris'
          notification.actionUrl = routes.protected.favoris
        }else{
          notification.message =  `${user?.firstname} ${user?.lastname} a ajouté votre annonce à ses favoris`
          notification.actionUrl = routes.protected.properties+'/'+idProperty
        }
        await createNotification(notification)
      }

    } else {
      const index = favoris.indexOf(idProperty);
      if (index !== -1) {
        favoris.splice(index, 1);
      }
    }

    await updateUser(user?.uid!, {
      ...user,
      favoris
    });

    update({
      user: {
        ...user,
        favoris
      }
    });

    setIsLoading(false);
  };

  React.useEffect(() => {
    if (user?.favoris)
      setIsFavorite(user.favoris.includes(idProperty));
  }, [user, idProperty]);

  return (
    <Heart
      className={clsx({
        "text-red-500": !isFavorite,
        "text-red-500 fill-red-500": isFavorite,
        "cursor-pointer": !isLoading,
        "cursor-not-allowed opacity-50": isLoading,
      })}
      size={30}
      onClick={isLoading ? undefined : toggleFavorite}
    />
  );
}