'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Form,
} from '@/components/ui/form';
import { SearchFormSchemaType } from '@/models/schema';
import SelectProvince from './SelectProvince';
import SelectCity from './SelectCity';
import SelectStreet from './SelectStreet';

interface LocationFiltersDropdownProps {
  form: any; // Type du formulaire de react-hook-form
  onSubmit: (values: SearchFormSchemaType) => void;
  clearLocationFilters: () => void;
}

export default function LocationFiltersDropdown({
  form,
  onSubmit,
  clearLocationFilters,
}: LocationFiltersDropdownProps) {
  return (
    <div className="absolute top-full left-1/2 transform -translate-x-1/2 md:left-0 md:transform-none mt-2 w-[calc(100vw-2rem)] md:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-20">
      {/* Flèche vers le haut */}
      <div className="absolute -top-2 right-10 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>

      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">📍 Filtres de localisation</h3>

        <Form {...form}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <SelectProvince />
              <SelectCity />
              <SelectStreet />
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                onClick={() => form.handleSubmit(onSubmit)()}
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
          </div>
        </Form>
      </div>
    </div>
  );
}
