"use client"

import * as React from "react"
import { Input } from "../ui/input"
import { useFormContext } from "react-hook-form"
import Select from 'react-select';
import { useQuery } from "@tanstack/react-query"
import { SelectFormApp } from "../shared/form/SelectFormApp";
import { useLocation } from "@/hooks/use-location";

const invalidAddressTypes = ["administrative"];
export function ComboboxComponent({ field }: Readonly<{ field: any }>) {
  const [inputValue, setInputValue] = React.useState('');
  const { setValue } = useFormContext()
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
          city: location.address?.city ?? location.address?.county,
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
    const { street, city, province, longitude, latitude, country, countryCode } = option
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
      options={data ?? []}
      onInputChange={handleSelectLocation}
      onChange={handleSetField}
      defaultValue={{ value: field.value.street, label: field.value.street }}
      placeholder="Rechercher une localisation..."
      noOptionsMessage={() => 'Aucun résultat trouvé'}
    />
  );
}

export const LocationSearch = ({ field, index, location }: Readonly<{ field: any, index: number, location: Location }>) => {
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
      options={data ?? []}
      onInputChange={handleSelectLocation}
      onChange={handleSetField}
      defaultInputValue={field.value[index].address}
      placeholder="Rechercher une localisation..."
      noOptionsMessage={() => 'Aucun résultat trouvé'}
    />
  );
}

export const InputDisabledComponent = ({ field }: Readonly<{ field: any }>) => {
  return (
    <Input {...field} value={field.value} disabled={true} />
  )
}

const searchAddress = async (inputValue: string) => {
  try {
    const response = await fetch(`/api/geocode/search?q=${encodeURIComponent(inputValue)}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
    return [];
  }
};

interface OptionType {
  label: string;
  value: string;
}
export const SelectProvinceComponent = ({ field }: Readonly<{ field: any }>) => {
  const { data: locations } = useLocation();
  const provinceOptions = React.useMemo((): OptionType[] => {
    if (!locations) return [];
    return Object.keys(locations)
      .sort((a: string, b: string) => a.localeCompare(b, 'fr'))
      .map((province: string): OptionType => ({
        label: province,
        value: province
      }));
  }, [locations]);
  return (
    <SelectFormApp
      key={`province`}
      control={field.control}
      id="province"
      name="province"
      options={provinceOptions}
      placeholder="Sélectionnez une province"
      value={field.value}
    />
  )
}

export const SelectCityComponent = ({ field }: Readonly<{ field: any }>) => {
  const { data: locations } = useLocation();
  const { watch } = useFormContext();
  const selectedProvince = watch('province');
  const cityOptions = React.useMemo((): OptionType[] => {
    if (!locations || !selectedProvince || !locations[selectedProvince]) {
      return [];
    }
    return Object.keys(locations[selectedProvince])
      .sort((a: string, b: string) => a.localeCompare(b, 'fr'))
      .map((city: string): OptionType => ({
        label: city,
        value: city
      }));
  }, [locations, selectedProvince]);
  return (
    <SelectFormApp
      key={`city`}
      control={field.control}
      id="city"
      name="city"
      options={cityOptions}
      placeholder="Sélectionnez une ville"
      value={field.value}
    />
  )
}

export const SelectStreetComponent = ({ field }: Readonly<{ field: any }>) => {
  const { data: locations } = useLocation();
  const { watch } = useFormContext();
  const selectedProvince = watch('province');
  const selectedCity = watch('city');
  const streetOptions = React.useMemo((): OptionType[] => {
    if (!selectedProvince) {
      return []
    }
    if (!locations || !selectedCity || !locations[selectedProvince][selectedCity]) {
      return [];
    }
    return locations[selectedProvince][selectedCity]
      .sort((a: string, b: string) => a.localeCompare(b, 'fr'))
      .map((street: string): OptionType => ({
        label: street,
        value: street
      }));
  }, [locations, selectedProvince, selectedCity]);

  return (
    <SelectFormApp
      key={`street`}
      control={field.control}
      id="street"
      name="street"
      options={streetOptions}
      placeholder="Sélectionnez un quartier"
      disabled={!selectedCity}
      value={field.value}
    />
  )
}