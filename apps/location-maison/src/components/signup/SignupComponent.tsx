'use client'
import React from 'react'
import { Signup } from './Signup'
import { useWindowSize } from '@/hooks/useSize'
import { SignupMobileComponent } from './SignupMobileComponent'

export default function SignupComponent() {
    const size = useWindowSize()
    if (size.width > 768) {
        return (
            <Signup />
        )
    }
    return (
        <SignupMobileComponent/>
    )
}
