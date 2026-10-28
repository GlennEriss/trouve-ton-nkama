'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@trouve-ton-nkama/ui/button';
import { ProvinceCombobox } from '@/components/location/combobox/ProvinceCombobox';
import { CityCombobox } from '@/components/location/combobox/CityCombobox';
import { QuarterCombobox } from '@/components/location/combobox/QuarterCombobox';
import { PhoneNumberFormAppSimple } from '@/components/shared/form/PhoneNumberFormAppSimple';
import { useOSMLocations } from '@/hooks/useOSMLocations';
import { quickListingDraftSchema, QUICK_LISTING_DESCRIPTION_MAX, QUICK_LISTING_PRICE_XAF, type QuickListingDraft } from '@/features/quick-listings/draft';
import QuickListingSafetyNotice from './QuickListingSafetyNotice';

export default function QuickListingForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [review, setReview] = useState<QuickListingDraft | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const locations = useOSMLocations();
  const form = useForm<QuickListingDraft>({
    resolver: zodResolver(quickListingDraftSchema),
    mode: 'onBlur',
    shouldUnregister: false,
    defaultValues: { description: '', address: { province: '', city: '', district: '' }, contactPhone: '' },
  });
  const { register, watch, trigger, handleSubmit, setError, formState: { errors } } = form;
  const [province, city, description] = watch(['address.province', 'address.city', 'description']);
  useEffect(() => { headingRef.current?.focus(); }, [step]);
  useEffect(() => { if (review) resultRef.current?.focus(); }, [review]);
  useEffect(() => { const subscription = watch(() => setReview(null)); return () => subscription.unsubscribe(); }, [watch]);

  const checkDraft = (values: QuickListingDraft) => {
    if (locations.isLoading || locations.error) return;
    if (!locations.getAllProvinces().some(p => p.name === values.address.province)) {
      setError('address.province', { message: 'Choisissez une province dans la liste.' }); return;
    }
    if (!locations.getCitiesByProvince(values.address.province).some(c => c.name === values.address.city)) {
      setError('address.city', { message: 'Choisissez une ville de cette province.' }); return;
    }
    if (!locations.getQuartersByCity(values.address.city).some(q => q.name === values.address.district)) {
      setError('address.district', { message: 'Choisissez un quartier de cette ville.' }); return;
    }
    setReview(values);
  };
  const next = async () => { if (await trigger('description', { shouldFocus: true })) setStep(2); };
  const locationError = errors.address;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-5 pb-28 pt-6 text-gray-900 dark:text-gray-100">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-primary">Créer une annonce rapide</h1>
        <p>Une offre immobilière sans photo, en deux étapes. Publication : {QUICK_LISTING_PRICE_XAF} FCFA après raccordement du paiement.</p>
        <p className="text-sm">L’annonce sera visible après paiement confirmé et approbation. Elle n’expirera pas automatiquement ; un administrateur pourra la supprimer.</p>
      </header>
      <ol aria-label="Étapes de création" className="grid grid-cols-2 gap-3 text-sm">
        <li aria-current={step === 1 ? 'step' : undefined} className={step === 1 ? 'font-semibold text-primary' : ''}>1. Votre annonce</li>
        <li aria-current={step === 2 ? 'step' : undefined} className={step === 2 ? 'font-semibold text-primary' : ''}>2. Localisation et contact</li>
      </ol>
      <FormProvider {...form}>
        <form noValidate onSubmit={event => { event.preventDefault(); if (step === 1) void next(); else void handleSubmit(checkDraft)(event); }} className="space-y-6 rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold">{step === 1 ? 'Votre annonce' : 'Localisation et contact'}</h2>
          {step === 1 ? (
            <div className="space-y-2">
              <label htmlFor="quick-description" className="block font-medium">Texte de l’annonce</label>
              <p id="quick-description-help" className="text-sm text-gray-600 dark:text-gray-300">Décrivez votre bien, le loyer ou prix et les conditions dans ce champ. Aucune photo ne pourra être ajoutée à cette annonce.</p>
              <textarea id="quick-description" {...register('description')} rows={8} maxLength={QUICK_LISTING_DESCRIPTION_MAX} aria-invalid={!!errors.description} aria-describedby="quick-description-help quick-description-error" className="w-full rounded-xl border border-gray-300 bg-transparent p-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary dark:border-gray-600" />
              <p className="text-right text-sm text-gray-600 dark:text-gray-300">{description.length} / {QUICK_LISTING_DESCRIPTION_MAX}</p>
              <p id="quick-description-error" role={errors.description ? 'alert' : undefined} className="text-sm text-red-700 dark:text-red-300">{errors.description?.message}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {locations.isLoading && <p role="status">Chargement des localisations…</p>}
              {locations.error && <p role="alert">Les localisations sont indisponibles. Votre saisie reste conservée tant que vous restez sur cette page. Réessayez plus tard.</p>}
              <fieldset disabled={locations.isLoading || !!locations.error} className="space-y-5 [&_button[role=combobox]]:min-h-11 [&_button[role=combobox]]:h-auto [&_button[role=combobox]]:whitespace-normal">
                <legend className="sr-only">Localisation du bien</legend>
                <div role="group" aria-label="Province" className="space-y-2"><p className="font-medium">Province</p><ProvinceCombobox /><p role={locationError?.province ? 'alert' : undefined} className="text-sm text-red-700 dark:text-red-300">{locationError?.province?.message}</p></div>
                <div role="group" aria-label="Ville" className="space-y-2"><p className="font-medium">Ville</p><CityCombobox disabled={!province} /><p role={locationError?.city ? 'alert' : undefined} className="text-sm text-red-700 dark:text-red-300">{locationError?.city?.message}</p></div>
                <div role="group" aria-label="Quartier" className="space-y-2"><p className="font-medium">Quartier</p><QuarterCombobox disabled={!city} /><p role={locationError?.district ? 'alert' : undefined} className="text-sm text-red-700 dark:text-red-300">{locationError?.district?.message}</p></div>
              </fieldset>
              <PhoneNumberFormAppSimple control={form.control} name="contactPhone" label="Téléphone de contact" />
              <p className="text-sm text-gray-600 dark:text-gray-300">Ce numéro sera public pour les appels et WhatsApp. Ce n’est pas nécessairement votre numéro de paiement.</p>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            {step === 2 && <Button type="button" variant="outline" className="min-h-11" onClick={() => { setReview(null); setStep(1); }}>Retour</Button>}
            <Button type="submit" className="min-h-11" disabled={step === 2 && (locations.isLoading || !!locations.error)}>{step === 1 ? 'Continuer' : 'Vérifier mon annonce'}</Button>
          </div>
          {review && <div ref={resultRef} tabIndex={-1} role="status" className="space-y-3 rounded-xl border border-primary/30 p-4">
            <h3 className="font-semibold">Saisie vérifiée — annonce non publiée</h3>
            <p className="whitespace-pre-wrap break-words">{review.description}</p>
            <p>{review.address.province} · {review.address.city} · {review.address.district}</p>
            <p>{review.contactPhone}</p>
            <p>Le paiement MyPayGa de {QUICK_LISTING_PRICE_XAF} FCFA n’est pas encore disponible pour les annonces rapides. Aucun débit ni enregistrement sur la plateforme n’a été effectué.</p>
          </div>}
        </form>
      </FormProvider>
      <QuickListingSafetyNotice />
    </div>
  );
}
