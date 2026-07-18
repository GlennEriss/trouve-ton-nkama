'use client'

import React, { useEffect } from 'react'
import { Control, FieldValues, Path } from 'react-hook-form'
import { SelectFormApp } from './SelectFormApp'
import { getDaysInMonth } from '@/lib/dateUtils'
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

interface DateSelectProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label: string
  disabled?: boolean
  className?: string
}

export const DateSelect = <T extends FieldValues>({
  control,
  name,
  label,
  disabled = false,
  className = ''
}: DateSelectProps<T>) => {


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

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        // Récupérer les valeurs actuelles du formulaire
        const currentValues = control._formValues;
        const currentMonth = currentValues?.[name]?.month || '';
        const currentYear = currentValues?.[name]?.year || '';
        
        // Générer les options de jours dynamiquement
        const daysInMonth = getDaysInMonth(currentMonth, currentYear);
        const dayOptions = Array.from({ length: daysInMonth }, (_, i) => ({
          label: String(i + 1).padStart(2, '0'),
          value: String(i + 1).padStart(2, '0')
        }));

        // Forcer la validation quand les valeurs changent
        useEffect(() => {
          const currentDate = currentValues?.[name];
          // Déclencher la validation dès qu'au moins un champ est rempli
          if (currentDate?.day || currentDate?.month || currentDate?.year) {
            // Forcer la validation immédiatement
            (control as any)._trigger?.(name);
          }
        }, [currentValues?.[name], control, name]);
        
        return (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </FormLabel>
            <div className="grid grid-cols-3 gap-2">
              <SelectFormApp
                control={control}
                name={`${name}.day` as any}
                label=""
                options={dayOptions}
                placeholder="Jour"
                aria-label="Jour de naissance"
                disabled={disabled}
                className="text-sm"
              />
              <SelectFormApp
                control={control}
                name={`${name}.month` as any}
                label=""
                options={monthOptions}
                placeholder="Mois"
                aria-label="Mois de naissance"
                disabled={disabled}
                className="text-sm"
              />
              <SelectFormApp
                control={control}
                name={`${name}.year` as any}
                label=""
                options={yearOptions}
                placeholder="Année"
                aria-label="Année de naissance"
                disabled={disabled}
                className="text-sm"
              />
            </div>
            {(control._formState?.errors as any)?.[name]?.root?.message && (
              <p className="text-sm text-red-600">{(control._formState.errors as any)[name].root.message}</p>
            )}

          </FormItem>
        );
      }}
    />
  )
}
