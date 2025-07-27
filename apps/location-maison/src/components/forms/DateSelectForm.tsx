'use client'

import React, { useEffect } from 'react'
import { Control, Controller } from 'react-hook-form'
import { SelectForm } from './SelectForm'
import { getDaysInMonth } from '@/lib/dateUtils'

interface DateSelectFormProps {
  form: any
  name: string
  label: string
  disabled?: boolean
  className?: string
}

export const DateSelectForm: React.FC<DateSelectFormProps> = ({
  form,
  name,
  label,
  disabled = false,
  className = ''
}) => {


  // Générer les options pour les mois
  const monthOptions = [
    { label: 'Janvier', value: '01' },
    { label: 'Février', value: '02' },
    { label: 'Mars', value: '03' },
    { label: 'Avril', value: '04' },
    { label: 'Mai', value: '05' },
    { label: 'Juin', value: '06' },
    { label: 'Juillet', value: '07' },
    { label: 'Août', value: '08' },
    { label: 'Septembre', value: '09' },
    { label: 'Octobre', value: '10' },
    { label: 'Novembre', value: '11' },
    { label: 'Décembre', value: '12' }
  ];

  // Générer les options pour les années (100 ans en arrière)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 100 }, (_, i) => {
    const year = currentYear - i;
    return {
      label: String(year),
      value: String(year)
    };
  });

  // Récupérer l'erreur de validation pour le champ de date
  const fieldError = form.formState.errors[name as keyof typeof form.formState.errors];

  // Récupérer les valeurs actuelles du formulaire
  const currentValues = form.getValues();
  const currentMonth = currentValues?.[name]?.month || '';
  const selectedYear = currentValues?.[name]?.year || '';
  
  // Générer les options de jours dynamiquement
  const daysInMonth = getDaysInMonth(currentMonth, selectedYear);
  const dayOptions = Array.from({ length: daysInMonth }, (_, i) => ({
    label: String(i + 1).padStart(2, '0'),
    value: String(i + 1).padStart(2, '0')
  }));

  // Forcer la validation quand les valeurs changent
  useEffect(() => {
    const currentDate = currentValues?.[name];
    // Déclencher la validation dès qu'au moins un champ est rempli
    if (currentDate?.day || currentDate?.month || currentDate?.year) {
      form.trigger(name);
    }
  }, [currentValues?.[name], form, name]);

  // Récupérer les erreurs des sous-champs
  const dayError = form.formState.errors[`${name}.day` as keyof typeof form.formState.errors];
  const monthError = form.formState.errors[`${name}.month` as keyof typeof form.formState.errors];
  const yearError = form.formState.errors[`${name}.year` as keyof typeof form.formState.errors];

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="grid grid-cols-3 gap-2">
        <SelectForm
          form={form}
          name={`${name}.day`}
          label=""
          options={dayOptions}
          placeholder="Jour"
          disabled={disabled}
        />
        <SelectForm
          form={form}
          name={`${name}.month`}
          label=""
          options={monthOptions}
          placeholder="Mois"
          disabled={disabled}
        />
        <SelectForm
          form={form}
          name={`${name}.year`}
          label=""
          options={yearOptions}
          placeholder="Année"
          disabled={disabled}
        />
      </div>
      {/* Afficher les erreurs des sous-champs */}
      {(dayError || monthError || yearError) && (
        <div className="space-y-1">
          {dayError && <p className="text-sm text-red-600">{dayError.message}</p>}
          {monthError && <p className="text-sm text-red-600">{monthError.message}</p>}
          {yearError && <p className="text-sm text-red-600">{yearError.message}</p>}
        </div>
      )}
      {/* Afficher l'erreur de l'objet parent (validation d'âge, etc.) */}
      {fieldError && (
        <p className="text-sm text-red-600">{fieldError.message}</p>
      )}
    </div>
  )
} 