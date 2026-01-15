/**
 * SignupFormWrapper Component (V1)
 * 
 * Wrapper component that integrates SignupForm with LayoutAuth.
 * This maintains compatibility with the existing page structure.
 */

'use client';

import React, { useState } from 'react';
import { LayoutAuth } from '@/components/layouts/LayoutAuth';
import { SignupForm } from './SignupForm';

/**
 * SignupFormWrapper Component
 * 
 * Wraps SignupForm with LayoutAuth for consistent layout and OAuth buttons.
 */
export const SignupFormWrapper: React.FC = () => {
  const [isOtherMethodConnection, setIsOtherMethodConnection] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);

  return (
    <LayoutAuth
      type="Signup"
      setIsOtherMethodConnection={setIsOtherMethodConnection}
      isFormLoading={isFormLoading}
    >
      <SignupForm onLoadingChange={setIsFormLoading} />
    </LayoutAuth>
  );
};
