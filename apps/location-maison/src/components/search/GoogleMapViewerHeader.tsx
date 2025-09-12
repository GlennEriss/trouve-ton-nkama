'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useRouter, useSearchParams } from 'next/navigation';
import { SearchFormSchema, SearchFormSchemaType } from '@/models/schema';
import SelectProvince from './SelectProvince';
import SelectCity from './SelectCity';
import SelectStreet from './SelectStreet';

interface GoogleMapViewerHeaderProps {
  items: any[];
  onOpenChange: (open: boolean) => void;
  onSearch?: (values: SearchFormSchemaType) => void;
  onLocationFilter?: (values: SearchFormSchemaType) => void;
  onClearFilters?: () => void;
}

export default function GoogleMapViewerHeader({
  items,
  onOpenChange,
  onSearch,
  onLocationFilter,
  onClearFilters,
}: GoogleMapViewerHeaderProps) {
  const [showFloatingDropdown, setShowFloatingDropdown] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialisation du formulaire avec react-hook-form
  const form = useForm<SearchFormSchemaType>({
    resolver: zodResolver(SearchFormSchema),
    defaultValues: {
      searchText: '',
      province: '',
      city: '',
      street: '',
    },
  });

  const { watch, setValue, reset, formState: { isSubmitting } } = form;
  const watchedProvince = watch('province');
  const watchedCity = watch('city');

  // Fonction pour nettoyer les valeurs (remplacer les valeurs vides par des chaînes vides)
  const cleanValue = (value: string) => {
    return value === 'none' ? '' : value;
  };

  // Fonction pour obtenir la valeur d'affichage (remplacer les chaînes vides par 'none')
  const getDisplayValue = (value: string) => {
    return value === '' ? 'none' : value;
  };


  // Fonction de soumission du formulaire de recherche
  const onSubmit = async (values: SearchFormSchemaType) => {
    try {
      if (onSearch) {
        await onSearch({
          ...values,
          province: cleanValue(values.province || ''),
          city: cleanValue(values.city || ''),
          street: cleanValue(values.street || ''),
        });
      } else {
        // Comportement par défaut : navigation vers la page de recherche
        const params = new URLSearchParams();
        if (values.searchText) params.append('query', values.searchText);
        if (cleanValue(values.province || '')) params.append('province', cleanValue(values.province || ''));
        if (cleanValue(values.city || '')) params.append('city', cleanValue(values.city || ''));
        if (cleanValue(values.street || '')) params.append('street', cleanValue(values.street || ''));
        //router.replace(`/search?${params.toString()}`);
      }
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
    }
  };

  // Fonction pour appliquer les filtres de localisation
  const applyLocationFilters = async (values: SearchFormSchemaType) => {
    try {
      if (onLocationFilter) {
        await onLocationFilter({
          ...values,
          province: cleanValue(values.province || ''),
          city: cleanValue(values.city || ''),
          street: cleanValue(values.street || ''),
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'application des filtres:', error);
    } finally {
      setShowFloatingDropdown(false);
    }
  };

  // Fonction pour effacer les filtres
  const clearLocationFilters = () => {
    reset({
      searchText: form.getValues('searchText'), // Garder le texte de recherche
      province: '',
      city: '',
      street: '',
    });

    if (onClearFilters) {
      onClearFilters();
    }

    setShowFloatingDropdown(false);
  };

  return (
    <div className="flex md:flex-row items-center justify-between p-2 lg:p-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 lg:w-full">
        {/* Composant de recherche flottante */}
        <div className="relative">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center bg-white rounded-full shadow-lg border border-gray-200 px-4 py-3 min-w-[320px]">
              <button
                type="submit"
                disabled={isSubmitting}
                className="p-1 hover:stroke-[#1FA89B] disabled:opacity-50 disabled:cursor-not-allowed mr-3"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1FA89B]"></div>
                ) : (
                  <Search size={20} className="text-gray-500 hover:stroke-[#1FA89B]" />
                )}
              </button>

              <FormField
                control={form.control}
                name="searchText"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        placeholder="Logement, ville, quartier..."
                        className="border-none outline-none text-sm text-gray-700 placeholder-gray-500 bg-transparent focus-visible:ring-0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <button
                type="button"
                onClick={() => setShowFloatingDropdown(!showFloatingDropdown)}
                className="ml-3 flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs font-medium text-gray-700 transition-colors"
                aria-expanded={showFloatingDropdown}
              >
                Filtres
                <ChevronDown
                  size={14}
                  className={`transition-transform ${showFloatingDropdown ? 'rotate-180' : ''}`}
                />
              </button>
            </form>
          </Form>

          {/* Dropdown des filtres */}
          {showFloatingDropdown && (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 md:left-0 md:transform-none mt-2 w-[calc(100vw-2rem)] md:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-20">
              {/* Flèche vers le haut */}
              <div className="absolute -top-2 right-10 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>

              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">📍 Filtres de localisation</h3>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(applyLocationFilters)} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <SelectProvince />
                      <SelectCity />
                      <SelectStreet />
                    </div>

                    {/* Boutons d'action */}
                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        type="submit"
                        className="bg-[#146B67] hover:bg-[#1FA89B] text-white px-4 py-2 text-sm"
                      >
                        Appliquer
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={clearLocationFilters}
                        className="border-[#146B67] text-[#146B67] hover:bg-[#146B67] hover:text-white px-4 py-2 text-sm"
                      >
                        Effacer
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </div>
          )}
        </div>

        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full lg:ml-auto">
          {items.filter((p: any) => p.latitude && p.longitude).length} biens localisés
        </span>
      </div>
      <button
        onClick={() => onOpenChange(false)}
        className="lg:block hidden hover:bg-gray-100 rounded-full transition-colors ml-auto"
      >
        <X size={24} className="text-gray-500" />
      </button>
    </div>
  );
}
