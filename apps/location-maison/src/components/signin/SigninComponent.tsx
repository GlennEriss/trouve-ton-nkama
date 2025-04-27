'use client'
import { Signin } from '@/components/signin/Signin'
import { useWindowSize } from '@/hooks/useSize'
import React from 'react'
import SigninMobileComponent from './SigninMobileComponent'

export default function SigninComponent() {
    const size = useWindowSize()
    if (size.width > 768) {
        return (
            <Signin />
        )
    }
    return (
        <SigninMobileComponent/>
    )
}
