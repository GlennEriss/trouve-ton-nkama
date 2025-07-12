'use server'

import { FormLoginSchemaType } from '@/models/schema';
import { signIn } from '@/next-auth/auth'
import { AuthError } from 'next-auth'

export const login = async (user: FormLoginSchemaType) => {
  const { email, password } = user;

  try {
    await signIn('credentials', {
      redirect: false, // Pas de redirection automatique
      login: email, // Assurez-vous que la clé correspond au `authorize` côté serveur
      password: password,
  });
    return { error: false, success: true, message: 'Login successful' };
  } catch (error) {
    console.error('Authentication Error:', error);
    if (error instanceof AuthError) {
      return { error: true, success: false, message: 'Invalid credentials' };
    }
    return { error: true, success: false, message: 'An unexpected error occurred' };
  }
};