'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
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
import { SearchFormSchemaType } from '@/models/schema';
import { useFormGoogleLocation } from '@/hooks/google-map/use-form-google-location';
import { useRouter } from 'next/navigation';
import { routes } from '@/constantes/routes';

// Import dynamique du composant LocationFiltersDropdown
const LocationFiltersDropdown = dynamic(
  () => import('./LocationFiltersDropdown'),
  {
    ssr: false,
    loading: () => (
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 md:left-0 md:transform-none mt-2 w-[calc(100vw-2rem)] md:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-20 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
          <div className="flex gap-3 pt-4">
            <div className="h-8 bg-gray-200 rounded w-20"></div>
            <div className="h-8 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
      </div>
    )
  }
);

interface GoogleMapViewerHeaderProps {
  length: number;
  onOpenChange: (open: boolean) => void;
}

export default function GoogleMapViewerHeader({
  length,
  onOpenChange,
}: GoogleMapViewerHeaderProps) {
  const [showFloatingDropdown, setShowFloatingDropdown] = useState(false);
  const { form } = useFormGoogleLocation();
  const router = useRouter();
  const { reset, formState: { isSubmitting } } = form;

  // Fonction pour effacer les filtres
  const clearLocationFilters = () => {
    reset({
      searchText: form.getValues('searchText'), // Garder le texte de recherche
      province: '',
      city: '',
      street: '',
    });
    router.replace(routes.public.search);
  };
  const onSubmit = (values: SearchFormSchemaType) => {
    const params = new URLSearchParams();
    if (values.searchText) params.append("query", values.searchText);
    if (values.province) params.append("province", values.province);
    if (values.city) params.append("city", values.city);
    if (values.street) params.append("street", values.street);
    router.replace(routes.public.search + `?${params.toString()}`);
  }
  return (
    <div className="flex md:flex-row items-center justify-between p-2 lg:p-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 lg:w-full">
        {/* Composant de recherche flottante */}
        <div className="relative">
          <Form {...form}>
            <div className="flex items-center bg-white rounded-full shadow-lg border border-gray-200 px-4 py-3 min-w-[320px]">
              <button
                type="button"
                disabled={isSubmitting}
                className="p-1 hover:stroke-secondary disabled:opacity-50 disabled:cursor-not-allowed mr-3"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-secondary"></div>
                ) : (
                  <Search size={20} className="text-gray-500 hover:stroke-secondary" />
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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            form.handleSubmit(onSubmit)();
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
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
              </Button>
            </div>
          </Form>

          {/* Dropdown des filtres */}
          {showFloatingDropdown && (
            <LocationFiltersDropdown
              form={form}
              onSubmit={onSubmit}
              clearLocationFilters={clearLocationFilters}
            />
          )}
        </div>

        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full lg:ml-auto">
          {length} biens localisés
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
