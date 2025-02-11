'use client'
import React from 'react'
import { Heart } from "lucide-react";
import clsx from 'clsx';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useSession } from 'next-auth/react';
import { updateUser } from '@/db/user.db';

type ButtonFavorisProps = {
    idProperty: string
}
export const ButtonFavoris: React.FC<ButtonFavorisProps> = ({ idProperty }) => {
    const user = useCurrentUser()
    const { update } = useSession()
    const [isFavorite, setIsFavorite] = React.useState(false);
    const toggleFavorite = async () => {
        const addInFavorite = !isFavorite
        setIsFavorite(addInFavorite);
        const favoris = user?.favoris || [];
        if (addInFavorite) {
            favoris.push(idProperty)
        } else {
            const index = favoris.indexOf(idProperty)
            if (index !== -1) {
                favoris.splice(index, 1)
            }
        }
        await updateUser(user?.uid!, {
            ...user,
            favoris
        })
        update({
            user: {
                ...user,
                favoris
            }
        })
    };
    React.useEffect(() => {
        if (user?.favoris)
            setIsFavorite(user.favoris.includes(idProperty))
    }, [user])
    return (
        <Heart className={clsx({
            "text-red-500": !isFavorite,
            "text-red-500 fill-red-500": isFavorite
        })}
            size='30'
            onClick={toggleFavorite}
        />
    )
}
