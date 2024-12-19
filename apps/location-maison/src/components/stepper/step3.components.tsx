"use client"

import * as React from "react"
import { Input } from "../ui/input"
import { useForm, useFormContext } from "react-hook-form"
import Select from 'react-select';
import { useQuery } from "@tanstack/react-query"

const invalidAddressTypes = ["administrative"];
export function ComboboxComponent({ field }: { field: any }) {
  const [inputValue, setInputValue] = React.useState('');
  const {setValue} = useFormContext()
  const { data, isPending } = useQuery({
      queryKey: ['locations', inputValue],
      queryFn: async () => {
          const response = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${inputValue}&format=json&addressdetails=1&limit=10&countrycodes=GA`
          );
          const data = await response.json();
          const formattedOptions = data
          .filter((item: any) => !invalidAddressTypes.includes(item.addresstype))
          .map((location: any) => ({
              value: location.display_name,
              label: location.display_name,
              longitude: location.lon,
              latitude: location.lat,
              street: location.name,
              city: location.address?.city ? location.address.city: location.address.county,
              province: location.address.state,
              country: location.address.country,
              countryCode: location.address.country_code,
          }));
          return formattedOptions
      }
  })
  const handleSelectLocation = (value: any) => {
      setInputValue(value)
  };
  const handleSetField = (option: any) => {
      const {street, city, province, longitude, latitude, country, countryCode} = option
      field.onChange(street)
      setValue('city', city)
      setValue('province', province)
      setValue('longitude', longitude)
      setValue('latitude', latitude)
      setValue('country', country)
      setValue('countryCode', countryCode)
  }
  return (
      <Select
          isSearchable
          isLoading={isPending}
          options={data ? data : []}
          onInputChange={handleSelectLocation}
          onChange={handleSetField}
          defaultValue={{value: field.value.street, label: field.value.street}}
          placeholder="Rechercher une localisation..."
          noOptionsMessage={() => 'Aucun résultat trouvé'}
      />
  );
}

export const LocationSearch = ({ field, index, location }: { field: any, index: number, location: Location }) => {
  const [inputValue, setInputValue] = React.useState('');
  const { data, isPending } = useQuery({
      queryKey: ['locations', inputValue],
      queryFn: async () => {
          const response = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${inputValue}&format=json&addressdetails=1&limit=10&countrycodes=GA`
          );
          const data = await response.json();
          const formattedOptions = data.map((location: any) => ({
              value: location.display_name,
              label: location.display_name,
              longitude: location.lon,
              latitude: location.lat
          }));
          return formattedOptions
      }
  })
  const handleSelectLocation = (value: any) => {
      setInputValue(value)
  };
  const handleSetField = (option: any) => {
      
  }
  return (
      <Select
          isSearchable
          isLoading={isPending}
          options={data ? data : []}
          onInputChange={handleSelectLocation}
          onChange={handleSetField}
          defaultInputValue={field.value[index].address}
          placeholder="Rechercher une localisation..."
          noOptionsMessage={() => 'Aucun résultat trouvé'}
      />
  );
}

export const InputDisabledComponent = ({ field }: { field: any }) => {
  return (
    <Input {...field} value={field.value} disabled={false} />
  )
}