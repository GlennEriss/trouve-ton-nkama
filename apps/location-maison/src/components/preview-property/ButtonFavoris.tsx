'use client'
import React from 'react'
import clsx from 'clsx';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useSession } from 'next-auth/react';
import { updateUser } from '@/db/user.db';
import { getPropertyById } from '@/db/property.db';
//import { createNotification } from '@/db/notification.db';
import { Notification } from '@/models/notification'
import { routes } from '@/constantes/routes';
import { RiHeart3Line } from 'react-icons/ri';
type ButtonFavorisProps = {
  idProperty: string
}

export const ButtonFavoris: React.FC<ButtonFavorisProps> = ({ idProperty }) => {
  const { user } = useCurrentUser()

  if(!user){
    return null
  }
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
        //await createNotification(notification)
      }

    } else {
      const index = favoris.indexOf(idProperty);
      if (index !== -1) {
        favoris.splice(index, 1);
      }
    }

    await updateUser(user?.uid, {
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
    <button
      className="relative flex items-center justify-center rounded-full transition-all duration-300 
                 hover:bg-red-100 dark:hover:bg-red-900 group"
      onClick={isLoading ? undefined : toggleFavorite}
      disabled={isLoading}
    >
      <RiHeart3Line
        className={clsx(
          "transition-all duration-300 ease-in-out",
          isFavorite
            ? "text-red-500 fill-red-500 scale-110"
            : "text-gray-400 group-hover:text-red-500"
        )}
        color='black'
        size={40}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="animate-spin h-5 w-5 border-t-2 border-red-500 border-solid rounded-full"></span>
        </div>
      )}
    </button>
  );
}