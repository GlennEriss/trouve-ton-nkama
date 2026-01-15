/**
 * SignupForm Component (V1)
 * 
 * Refactored signup form component using the useSignup hook.
 * UI-only component following the architecture pattern.
 */

'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { FormRegisterSchemaType, FormRegisterSchema } from '@/models/schema';
import { SignupData } from '../../services/auth.service.interface';
import { useSignup } from '../../hooks';
import { InputForm } from '@/components/forms/InputForm';
import { DateSelectForm } from '@/components/forms/DateSelectForm';
import { PhoneNumberForm } from '@/components/forms/PhoneNumberForm';
import { CheckboxForm } from '@/components/forms/CheckboxForm';
import { ButtonLoading } from '@/components/buttons/ButtonLoading';
import { Form } from '@/components/ui/form';
import { routes } from '@/constantes/routes';

/**
 * Transform FormRegisterSchemaType to SignupData
 */
function transformFormDataToSignupData(values: FormRegisterSchemaType): SignupData {
  // Convert birthdate structure to string format (YYYY-MM-DD)
  const birthDate = values.birthdate
    ? `${values.birthdate.year}-${String(values.birthdate.month).padStart(2, '0')}-${String(values.birthdate.day).padStart(2, '0')}`
    : '';

  return {
    email: values.email,
    password: values.password,
    firstName: values.firstname,
    lastName: values.lastname,
    birthDate,
    phoneNumber: values.phone,
    country: values.country || 'GA',
    acceptTerms: values.termsOfPrivacyPolicy,
    accountType: 'User', // Default to User (simple user)
  };
}

/**
 * SignupForm Props
 */
export interface SignupFormProps {
  /**
   * Callback to notify parent component of loading state changes
   */
  onLoadingChange?: (isLoading: boolean) => void;
}

/**
 * SignupForm Component
 * 
 * Displays the signup form and handles user registration.
 * Uses the useSignup hook for business logic.
 */
export const SignupForm: React.FC<SignupFormProps> = ({ onLoadingChange }) => {
  const router = useRouter();
  const { toast } = useToast();
  const { signup, isLoading, error, userId } = useSignup();

  const form = useForm<FormRegisterSchemaType>({
    resolver: zodResolver(FormRegisterSchema),
    mode: 'onChange', // Real-time validation
    defaultValues: {
      firstname: '',
      lastname: '',
      email: '',
      password: '',
      passwordConfirm: '',
      birthdate: {
        day: '',
        month: '',
        year: '',
      },
      phone: '',
      country: 'GA',
      termsOfPrivacyPolicy: false,
    },
  });

  /**
   * Handle form submission
   */
  const onSubmit = async (values: FormRegisterSchemaType) => {
    try {
      // Transform form data to SignupData
      const signupData = transformFormDataToSignupData(values);

      // Call the signup hook
      const result = await signup(signupData);

      if (result.success && result.userId) {
        // Success: show toast and redirect
        toast({
          duration: 5000,
          title: 'Création de compte',
          description: 'Votre compte a été créé avec succès!',
          variant: 'success',
        });

        // Redirect to success page
        router.push(`/signup/success?uid=${result.userId}`);
      } else {
        // Error: show error toast
        const errorMessage = result.error?.message || 'Une erreur est survenue lors de la création du compte.';
        const errorTitle = result.error?.code === 'EMAIL_ALREADY_IN_USE' 
          ? 'Email déjà utilisé'
          : result.error?.code === 'PHONE_ALREADY_IN_USE'
          ? 'Numéro déjà utilisé'
          : 'Erreur de création';

        toast({
          duration: 5000,
          title: errorTitle,
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      // Unexpected error
      console.error('Unexpected error during signup:', error);
      toast({
        duration: 5000,
        title: 'Erreur',
        description: 'Une erreur inattendue s\'est produite. Veuillez réessayer.',
        variant: 'destructive',
      });
    }
  };

  /**
   * Effect to handle error state from hook
   */
  useEffect(() => {
    if (error && !isLoading) {
      // Error is already handled in onSubmit, but we can add additional handling here if needed
      // The error state from the hook is mainly for component-level error display
    }
  }, [error, isLoading]);

  /**
   * Effect to handle successful signup
   */
  useEffect(() => {
    if (userId && !isLoading) {
      // User ID is available, redirect is handled in onSubmit
      // This effect is mainly for component-level success handling if needed
    }
  }, [userId, isLoading]);

  /**
   * Effect to notify parent of loading state changes
   */
  useEffect(() => {
    const isFormLoading = isLoading || form.formState.isSubmitting;
    onLoadingChange?.(isFormLoading);
  }, [isLoading, form.formState.isSubmitting, onLoadingChange]);

  const isFormLoading = isLoading || form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <h1 className="text-lg">Créer un compte pour commencer à poster des annonces</h1>
        
        <InputForm
          form={form}
          name="firstname"
          label="Nom"
          type="text"
          placeholder="John"
          className="p-5"
        />
        
        <InputForm
          form={form}
          name="lastname"
          label="Prénom"
          type="text"
          placeholder="Doe"
          className="p-5"
        />
        
        <InputForm
          form={form}
          name="email"
          label="Email"
          type="email"
          placeholder="johndoe@mail.test"
          className="p-5"
        />
        
        <DateSelectForm
          form={form}
          name="birthdate"
          label="Date de naissance"
          className="p-5"
        />

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Votre numéro de téléphone
          </label>
          <PhoneNumberForm
            form={form}
            label=""
            name="phone"
          />
        </div>
        
        <InputForm
          form={form}
          name="password"
          label="Mot de passe"
          type="password"
          placeholder="*******"
          className="p-5"
        />
        
        <InputForm
          form={form}
          name="passwordConfirm"
          label="Mot de passe"
          type="password"
          placeholder="*******"
          className="p-5"
        />
        
        <CheckboxForm
          form={form}
          name="termsOfPrivacyPolicy"
          labelElement={
            <>
              En cliquant sur s'inscrire, vous êtes en accord avec notre{' '}
              <a
                href={routes.public.confidentiality}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                politique de confidentialité
              </a>{' '}
              et nos{' '}
              <a
                href={routes.public.terms_of_use}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                conditions d'utilisation
              </a>
              .
            </>
          }
        />
        
        <ButtonLoading
          type="submit"
          disabled={isFormLoading}
          className="w-full bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67]"
        >
          {isFormLoading ? 'Création en cours...' : "S'enregistrer"}
        </ButtonLoading>
      </form>
    </Form>
  );
};
