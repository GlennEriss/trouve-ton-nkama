'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, MapPin } from 'lucide-react'
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

interface ProvinceComboboxProps {
  onSelect?: (province: string) => void
  disabled?: boolean
}

export function ProvinceCombobox({ onSelect, disabled }: ProvinceComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const { watch, setValue } = useFormContext<any>()
  const { getAllProvinces } = useOSMLocations()
  
  const selectedProvince = watch('address.province') || ''
  const provinces = getAllProvinces()

  const handleSelect = (provinceName: string) => {
    const province = provinces.find((p) => p.name === provinceName)
    if (!province) return

    // Mettre à jour le formulaire
    setValue('address.province', province.name)
    // Coordonnées au niveau racine (utilisées par useOnSubmitFormProperty)
    setValue('provinceLat', province.lat)
    setValue('provinceLon', province.lon)
    
    // Réinitialiser ville et quartier lors du changement de province
    setValue('address.city', '')
    setValue('cityLat', 0)
    setValue('cityLon', 0)
    setValue('address.district', '')
    setValue('streetLat', 0)
    setValue('streetLon', 0)
    // Réinitialiser longitude et latitude (seront remis à jour lors de la sélection du quartier)
    setValue('longitude', 0)
    setValue('latitude', 0)

    // Callback personnalisé
    onSelect?.(province.name)
    setOpen(false)
  }

  const selectedProvinceName = selectedProvince
    ? provinces.find((p) => p.name === selectedProvince)?.name
    : ''

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className={cn(!selectedProvinceName && 'text-muted-foreground')}>
              {selectedProvinceName || 'Sélectionner une province...'}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 z-[100]" align="start">
        <Command>
          <CommandInput placeholder="Rechercher une province..." className="h-9" />
          <CommandList>
            <CommandEmpty>Aucune province trouvée.</CommandEmpty>
            <CommandGroup>
              {provinces.map((province) => (
                <CommandItem
                  key={`province-${province.osmId}-${province.lat}-${province.lon}`}
                  value={province.name}
                  onSelect={() => handleSelect(province.name)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedProvinceName === province.name ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {province.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

