/**
 * SignupFormModern Component (V1)
 * 
 * Modern, elegant signup form with step-by-step wizard.
 * Beautiful design for desktop with smooth animations.
 */

'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { FormRegisterSchemaType, FormRegisterSchema } from '@/models/schema';
import { useSignup } from '../../hooks';
import { Form } from '@/components/ui/form';
import { Button } from '@trouve-ton-nkama/ui/button';
import { routes } from '@/constantes/routes';
import { InputFormApp } from '@/components/shared/form/InputFormApp';
import { DateSelect } from '@/components/shared/form/DateSelect';
import { PhoneNumberFormAppSimple } from '@/components/shared/form/PhoneNumberFormAppSimple';
import { CheckboxFormApp } from '@/components/shared/form/CheckboxFormApp';
import { ButtonApp } from '@/components/shared/ui/ButtonApp';
import { signIn } from 'next-auth/react';
import Logo from '@trouve-ton-nkama/ui/logo';
import {
  User,
  Mail,
  KeyRound,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Check,
  Home,
  Shield,
  Sparkles,
  Building2,
  Phone,
} from 'lucide-react';
import { createLogger } from '@/lib/logger';
import { PhoneAuthModal } from './PhoneAuthModal';
import { mapRegisterFormToSignupData, mapSignupErrorToToast } from './signup.mapper';
import { trackingEvents, useTrackEvent } from '@/features/analytics/tracking';

const logger = createLogger('auth.signup-form-modern');

/**
 * Transform FormRegisterSchemaType to SignupData
 */
function transformFormDataToSignupData(values: FormRegisterSchemaType) {
  return mapRegisterFormToSignupData(values);
}

// Left panel decorative background image (from /public)
const LEFT_PANEL_BG_IMAGE = '/auth-image.png';

// Step configuration
const steps = [
  { id: 1, title: 'Identité', icon: User, fields: ['accountType', 'firstname', 'lastname'] },
  { id: 2, title: 'Contact', icon: Mail, fields: ['email', 'phone'] },
  { id: 3, title: 'Naissance', icon: Calendar, fields: ['birthdate'] },
  { id: 4, title: 'Sécurité', icon: KeyRound, fields: ['password', 'passwordConfirm', 'termsOfPrivacyPolicy'] },
];

// Animation variants
const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const featureVariants = {
  initial: { opacity: 0, y: 20 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

/**
 * SignupFormModern Component
 */
export const SignupFormModern: React.FC = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { signup, isLoading } = useSignup();
  const { trackEvent } = useTrackEvent();
  const shouldReduceMotion = useReducedMotion();
  const [currentStep, setCurrentStep] = useState(1);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);

  const form = useForm<FormRegisterSchemaType>({
    resolver: zodResolver(FormRegisterSchema),
    mode: 'onChange',
    defaultValues: {
      accountType: 'User',
      acceptAnnouncerTerms: false,
      firstname: '',
      lastname: '',
      email: '',
      password: '',
      passwordConfirm: '',
      birthdate: { day: '', month: '', year: '' },
      phone: '',
      country: 'GA',
      termsOfPrivacyPolicy: false,
    },
  });
  const selectedAccountType = form.watch('accountType') || 'User';

  // Get current step fields for validation
  const currentStepConfig = steps[currentStep - 1];
  
  // Check if current step is valid
  const isCurrentStepValid = () => {
    const errors = form.formState.errors;
    const values = form.getValues();
    
    for (const field of currentStepConfig.fields) {
      if (field === 'accountType') {
        if (!values.accountType) return false;
      } else if (field === 'birthdate') {
        const bd = values.birthdate;
        if (!bd?.day || !bd?.month || !bd?.year) return false;
        if (errors.birthdate) return false;
      } else if (field === 'acceptAnnouncerTerms') {
        if (values.accountType === 'Announcer' && !values.acceptAnnouncerTerms) return false;
      } else if (field === 'termsOfPrivacyPolicy') {
        if (!values.termsOfPrivacyPolicy) return false;
      } else {
        const value = values[field as keyof FormRegisterSchemaType];
        if (!value || (typeof value === 'string' && value.trim() === '')) return false;
        if (errors[field as keyof typeof errors]) return false;
      }
    }

    if (currentStep === 4 && values.accountType === 'Announcer' && !values.acceptAnnouncerTerms) {
      return false;
    }
    return true;
  };

  // Navigate to next step
  const nextStep = async () => {
    const fieldsToValidate = currentStepConfig.fields as any[];
    const isValid = await form.trigger(fieldsToValidate);
    
    if (isValid && currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Navigate to previous step
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle form submission
  const onSubmit = async (values: FormRegisterSchemaType) => {
    trackEvent(trackingEvents.CTA_AUTH_SIGNUP_CLICK, {
      method: 'credentials',
      account_type: values.accountType,
      entry_point: 'signup_form',
    });

    logger.debug('Signup form submit requested', {
      values,
      errors: form.formState.errors,
      isValid: form.formState.isValid,
    });
    
    // Validate all fields before submitting
    const isValid = await form.trigger();
    logger.debug('Signup form validation completed', { isValid });
    
    if (!isValid) {
      logger.warn('Signup form validation failed', {
        errors: form.formState.errors,
      });
      toast({
        duration: 5000,
        title: 'Erreur de validation',
        description: 'Veuillez corriger les erreurs dans le formulaire.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const signupData = transformFormDataToSignupData(values);
      logger.debug('Calling signup service from form', { signupData });
      const result = await signup(signupData);
      logger.debug('Signup service returned result', { result });

      if (result.success && result.userId) {
        logger.info('Signup successful, redirecting to success page', {
          userId: result.userId,
        });
        trackEvent(trackingEvents.BUSINESS_AUTH_SIGNUP_SUCCESS, {
          account_type: values.accountType,
          signup_provider: 'credentials',
        });
        toast({
          duration: 5000,
          title: '🎉 Bienvenue !',
          description: 'Votre compte a été créé avec succès!',
          variant: 'success',
        });
        router.push(`/signup/success?uid=${result.userId}`);
      } else {
        logger.warn('Signup failed with business error', {
          error: result.error,
        });
        const { title, description } = mapSignupErrorToToast(result.error);

        toast({
          duration: 5000,
          title,
          description,
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Unexpected error during signup flow', { error });
      toast({
        duration: 5000,
        title: 'Erreur',
        description: 'Une erreur inattendue s\'est produite.',
        variant: 'destructive',
      });
    }
  };

  // Handle Google sign in
  const handleGoogleSignIn = async () => {
    trackEvent(trackingEvents.CTA_AUTH_GOOGLE_CLICK, {
      entry_point: 'signup_form',
    });
    setIsGoogleLoading(true);
    try {
      await signIn('google');
    } catch (error) {
      logger.error('Google sign-in failed from signup form', { error });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const isFormLoading = isLoading || form.formState.isSubmitting;

  // Features list for left panel
  const features = [
    { icon: Home, title: 'Trouvez votre logement', desc: 'Parcourez des milliers d\'annonces' },
    { icon: Shield, title: 'Sécurisé & Fiable', desc: 'Vos données sont protégées' },
    { icon: Sparkles, title: '100% Gratuit', desc: 'Inscription sans frais cachés' },
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-teal-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Left Panel - Branding & Features (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-600 to-secondary" />

        {/* Decorative background image — blends with gradient, does not reduce readability */}
        <div
          className="absolute inset-0 bg-cover bg-no-repeat opacity-20 mix-blend-overlay blur-[1px] pointer-events-none"
          style={{
            backgroundImage: `url(${LEFT_PANEL_BG_IMAGE})`,
            backgroundPosition: 'center bottom',
          }}
          aria-hidden
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
          {/* Logo & Title */}
          <div>
            <Link href={routes.public.homePage} className="flex items-center gap-3 mb-12 group">
              <motion.div
                whileHover={{ rotate: 10 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Logo width="56px" height="56px" />
              </motion.div>
              <span className="text-2xl font-bold tracking-tight">Trouve Ton Nkama</span>
            </Link>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl xl:text-5xl font-bold leading-tight mb-6"
            >
              Votre futur logement
              <br />
              <span className="text-teal-200">vous attend</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-lg text-white/80 max-w-md"
            >
              Rejoignez des milliers d'utilisateurs qui ont trouvé leur logement idéal au Gabon.
            </motion.p>
          </div>

          {/* Features */}
          <div className="space-y-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                custom={i}
                initial="initial"
                animate="animate"
                variants={featureVariants}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all duration-300"
              >
                <div className="p-3 rounded-xl bg-white/20">
                  <feature.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-white/70">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <p className="text-sm text-white/50">
            © 2026 Trouve Ton Nkama. Tous droits réservés.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-lg">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <Logo width="48px" height="48px" />
            <span className="text-xl font-bold text-primary">Trouve Ton Nkama</span>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <motion.button
                    type="button"
                    aria-label={`Étape ${step.id} sur ${steps.length} : ${step.title}`}
                    aria-current={step.id === currentStep ? 'step' : undefined}
                    onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                    className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
                      step.id === currentStep
                        ? 'bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-teal-500/30'
                        : step.id < currentStep
                        ? 'bg-secondary text-white cursor-pointer'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                    }`}
                    whileHover={step.id <= currentStep ? { scale: 1.05 } : {}}
                    whileTap={step.id <= currentStep ? { scale: 0.95 } : {}}
                  >
                    {step.id < currentStep ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                    {step.id === currentStep && (
                      <motion.div
                        layoutId="activeStep"
                        className="absolute inset-0 rounded-full border-2 border-secondary"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </motion.button>
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-1 mx-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-secondary"
                        initial={{ width: '0%' }}
                        animate={{ width: step.id < currentStep ? '100%' : '0%' }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentStep === 1 && 'Qui êtes-vous ?'}
                {currentStep === 2 && 'Comment vous joindre ?'}
                {currentStep === 3 && 'Votre date de naissance'}
                {currentStep === 4 && 'Sécurisez votre compte'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Étape {currentStep} sur {steps.length}
              </p>
            </div>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  variants={pageVariants}
                initial={shouldReduceMotion ? false : 'initial'}
                animate="animate"
                exit={shouldReduceMotion ? undefined : 'exit'}
                transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
                  className="space-y-4"
                >
                  {/* Step 1: Identity */}
                  {currentStep === 1 && (
                    <>
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Type de compte
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            aria-pressed={selectedAccountType === 'User'}
                            onClick={() =>
                              form.setValue('accountType', 'User', {
                                shouldDirty: true,
                                shouldValidate: true,
                              })
                            }
                            className={`rounded-2xl border p-3 text-left transition ${
                              selectedAccountType === 'User'
                                ? 'border-secondary bg-teal-50 dark:bg-teal-900/20'
                                : 'border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 font-semibold text-sm">
                              <User className="w-4 h-4" />
                              Utilisateur
                            </div>
                            <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">Chercher un logement</p>
                          </button>
                          <button
                            type="button"
                            aria-pressed={selectedAccountType === 'Announcer'}
                            onClick={() =>
                              form.setValue('accountType', 'Announcer', {
                                shouldDirty: true,
                                shouldValidate: true,
                              })
                            }
                            className={`rounded-2xl border p-3 text-left transition ${
                              selectedAccountType === 'Announcer'
                                ? 'border-secondary bg-teal-50 dark:bg-teal-900/20'
                                : 'border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 font-semibold text-sm">
                              <Building2 className="w-4 h-4" />
                              Annonceur
                            </div>
                            <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">Publier des annonces</p>
                          </button>
                        </div>
                      </div>
                      <InputFormApp
                        control={form.control}
                        name="firstname"
                        label="Nom"
                        type="text"
                        IconLucide={User}
                        IconColor="#9ca3af"
                        placeholder="Entrez votre nom"
                      />
                      <InputFormApp
                        control={form.control}
                        name="lastname"
                        label="Prénom"
                        type="text"
                        IconLucide={User}
                        IconColor="#9ca3af"
                        placeholder="Entrez votre prénom"
                      />
                    </>
                  )}

                  {/* Step 2: Contact */}
                  {currentStep === 2 && (
                    <>
                      <InputFormApp
                        control={form.control}
                        name="email"
                        label="Adresse email"
                        type="email"
                        IconLucide={Mail}
                        IconColor="#9ca3af"
                        placeholder="exemple@email.com"
                      />
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Numéro de téléphone
                        </label>
                        <PhoneNumberFormAppSimple
                          control={form.control}
                          name="phone"
                          label=""
                          placeholder="Ex: 66 12 34 56 (sans 0)"
                        />
                      </div>
                    </>
                  )}

                  {/* Step 3: Birth Date */}
                  {currentStep === 3 && (
                    <div className="py-4">
                      <DateSelect
                        control={form.control}
                        name="birthdate"
                        label="Sélectionnez votre date de naissance"
                      />
                      <p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Vous devez avoir au moins 18 ans
                      </p>
                    </div>
                  )}

                  {/* Step 4: Security */}
                  {currentStep === 4 && (
                    <>
                      <InputFormApp
                        control={form.control}
                        name="password"
                        label="Mot de passe"
                        type="password"
                        IconLucide={KeyRound}
                        IconColor="#9ca3af"
                        placeholder="Créez un mot de passe sécurisé"
                      />
                      <InputFormApp
                        control={form.control}
                        name="passwordConfirm"
                        label="Confirmez le mot de passe"
                        type="password"
                        IconLucide={KeyRound}
                        IconColor="#9ca3af"
                        placeholder="Confirmez votre mot de passe"
                      />
                      <div className="pt-2">
                        {selectedAccountType === 'Announcer' && (
                          <div className="mb-3">
                            <CheckboxFormApp
                              control={form.control}
                              name="acceptAnnouncerTerms"
                              label={
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  J&apos;accepte les{" "}
                                  <a
                                    href={routes.public.announcer_terms}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-secondary hover:underline font-medium"
                                  >
                                    conditions annonceur
                                  </a>
                                  .
                                </span>
                              }
                            />
                          </div>
                        )}
                        <CheckboxFormApp
                          control={form.control}
                          name="termsOfPrivacyPolicy"
                          label={
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              J'accepte la{' '}
                              <a
                                href={routes.public.confidentiality}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-secondary hover:underline font-medium"
                              >
                                politique de confidentialité
                              </a>
                              {' '}et les{' '}
                              <a
                                href={routes.public.terms_of_use}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-secondary hover:underline font-medium"
                              >
                                conditions d'utilisation
                              </a>
                            </span>
                          }
                        />
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-4">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    className="flex-1 h-12 rounded-full border-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    Retour
                  </Button>
                )}
                
                {currentStep < steps.length ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={!isCurrentStepValid()}
                    className="flex-1 h-12 rounded-full bg-gradient-to-r from-primary to-secondary hover:from-primary-800 hover:to-primary-600 text-white shadow-lg shadow-teal-500/25 disabled:opacity-50 disabled:shadow-none"
                  >
                    Continuer
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                ) : (
                  <ButtonApp
                    type="submit"
                    disabled={isFormLoading}
                    isLoading={isFormLoading}
                    className="flex-1 h-12 bg-gradient-to-r from-primary to-secondary hover:from-primary-800 hover:to-primary-600 shadow-lg shadow-teal-500/25"
                    title={isFormLoading ? 'Création en cours...' : 'Créer mon compte'}
                  />
                )}
              </div>
            </form>
          </Form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                ou continuer avec
              </span>
            </div>
          </div>

          {/* Social Login */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={isFormLoading || isGoogleLoading}
            className="w-full h-12 rounded-full border-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
          >
            {isGoogleLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 dark:border-white" />
            ) : (
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            <span className="font-medium">Continuer avec Google</span>
          </Button>

          {/* Phone (OTP) Login */}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              trackEvent(trackingEvents.CTA_AUTH_SIGNUP_CLICK, {
                method: 'phone',
                entry_point: 'signup_form',
              });
              setIsPhoneModalOpen(true);
            }}
            disabled={isFormLoading || isGoogleLoading}
            className="w-full h-12 mt-3 rounded-full border-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
          >
            <Phone className="w-5 h-5 mr-3 text-secondary" />
            <span className="font-medium">Continuer avec Numéro de téléphone</span>
          </Button>

          <PhoneAuthModal open={isPhoneModalOpen} onOpenChange={setIsPhoneModalOpen} />

          {/* Sign In Link */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Vous avez déjà un compte ?{' '}
            <Link
              href={routes.public.signin}
              className="text-secondary hover:underline font-semibold"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
