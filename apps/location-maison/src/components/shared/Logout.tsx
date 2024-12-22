import React from 'react'
import { Button } from '../ui/button'

export default function Logout() {
    return (
        <div className='md:hidden'>
            <Button variant='outline' className='w-full text-md border-red-500 text-red-500 hover:bg-red-500 hover:text-white'>
                Déconnexion
            </Button>
        </div>
    )
}
