'use client'
import React from 'react'
import { useWindowSize } from '@/hooks/useSize'
import { SignupFormModern } from '@/features/auth/ui/v1/SignupFormModern'
import { SignupMobileComponent } from './SignupMobileComponent'

export default function SignupComponent() {
    const size = useWindowSize()
    
    // Use modern design for desktop, existing mobile design for mobile
    if (size.width > 768) {
        return <SignupFormModern />
    }
    
    return <SignupMobileComponent />
}
