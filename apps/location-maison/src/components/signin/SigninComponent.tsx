'use client'
import { SigninFormModern } from '@/features/auth/ui/v1/SigninFormModern'
import { useWindowSize } from '@/hooks/useSize'
import React from 'react'
import SigninMobileComponent from './SigninMobileComponent'

export default function SigninComponent() {
    const size = useWindowSize()
    if (size.width > 768) {
        return (
            <SigninFormModern />
        )
    }
    return (
        <SigninMobileComponent/>
    )
}
