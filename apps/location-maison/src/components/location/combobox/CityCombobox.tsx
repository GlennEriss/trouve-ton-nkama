'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useOSMLocations } from '@/hooks/useOSMLocations'
import { useFormContext } from 'react-hook-form'

interface CityComboboxProps {
  onSelect?: (city: string) => void
  disabled?: boolean
}

export function CityCombobox({ onSelect, disabled }: CityComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const { watch, setValue } = useFormContext<any>()
  const { getAllCities, getCitiesByProvince } = useOSMLocations()
  
  const selectedProvince = watch('address.province') || ''
  const selectedCity = watch('address.city') || ''
  
  // Filtrer les villes selon la province sélectionnée
  const cities = React.useMemo(() => {
    if (selectedProvince) {
      return getCitiesByProvince(selectedProvince)
    }
    return getAllCities()
  }, [selectedProvince, getAllCities, getCitiesByProvince])

  const handleSelect = (cityName: string) => {
    const city = cities.find((c) => c.name === cityName)
    if (!city) return

    // Mettre à jour le formulaire
    setValue('address.city', city.name)
    // Coordonnées au niveau racine (utilisées par useOnSubmitFormProperty)
    setValue('cityLat', city.lat)
    setValue('cityLon', city.lon)
    
    // Réinitialiser quartier lors du changement de ville
    setValue('address.district', '')
    setValue('streetLat', 0)
    setValue('streetLon', 0)
    // Réinitialiser longitude et latitude (seront remis à jour lors de la sélection du quartier)
    setValue('longitude', 0)
    setValue('latitude', 0)

    // Callback personnalisé
    onSelect?.(city.name)
    setOpen(false)
  }

  const selectedCityName = selectedCity
    ? cities.find((c) => c.name === selectedCity)?.name
    : ''

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || (!selectedProvince && cities.length === 0)}
        >
          <div className="flex items-center space-x-2">
            <Home className="h-4 w-4 text-gray-400" />
            <span className={cn(!selectedCityName && 'text-muted-foreground')}>
              {selectedCityName || (selectedProvince ? 'Sélectionner une ville...' : 'Sélectionnez d\'abord une province')}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 z-[100]" align="start">
        <Command>
          <CommandInput placeholder="Rechercher une ville..." className="h-9" />
          <CommandList>
            <CommandEmpty>Aucune ville trouvée.</CommandEmpty>
            {!selectedProvince && (
              <CommandGroup heading="Toutes les villes">
                {cities.slice(0, 50).map((city) => (
                  <CommandItem
                    key={`city-${city.osmId}-${city.lat}-${city.lon}`}
                    value={city.name}
                    onSelect={() => handleSelect(city.name)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedCityName === city.name ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {city.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {selectedProvince && (
              <CommandGroup>
                {cities.map((city) => (
                  <CommandItem
                    key={`city-${city.osmId}-${city.lat}-${city.lon}`}
                    value={city.name}
                    onSelect={() => handleSelect(city.name)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedCityName === city.name ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {city.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

