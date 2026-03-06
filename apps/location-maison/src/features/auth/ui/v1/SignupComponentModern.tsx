/**
 * SignupComponentModern - Responsive Signup Component
 * 
 * Uses modern design for desktop and keeps the existing mobile design.
 */

'use client';

import React from 'react';
import { useWindowSize } from '@/hooks/useSize';
import { SignupFormModern } from './SignupFormModern';
import { SignupMobileComponent } from '@/components/signup/SignupMobileComponent';

/**
 * SignupComponentModern
 * 
 * Responsive wrapper that shows:
 * - Modern design for desktop (>768px)
 * - Existing mobile design for mobile (<=768px)
 */
export const SignupComponentModern: React.FC = () => {
  const size = useWindowSize();

  // Use modern design for desktop, existing mobile design for mobile
  if (size.width > 768) {
    return <SignupFormModern />;
  }

  return <SignupMobileComponent />;
};

export default SignupComponentModern;
