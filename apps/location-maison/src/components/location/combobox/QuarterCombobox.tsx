'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@trouve-ton-nkama/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@trouve-ton-nkama/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@trouve-ton-nkama/ui/popover'
import { useOSMLocations } from '@/hooks/useOSMLocations'
import { useFormContext } from 'react-hook-form'

interface QuarterComboboxProps {
  onSelect?: (quarter: string) => void
  disabled?: boolean
}

export function QuarterCombobox({ onSelect, disabled }: QuarterComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const { watch, setValue } = useFormContext<any>()
  const { getAllQuarters, getQuartersByCity, getQuartersByProvince } = useOSMLocations()
  
  const selectedProvince = watch('address.province') || ''
  const selectedCity = watch('address.city') || ''
  const selectedQuarter = watch('address.district') || ''
  
  // Filtrer les quartiers selon la ville/province sélectionnée
  const quarters = React.useMemo(() => {
    if (selectedCity) {
      return getQuartersByCity(selectedCity)
    }
    if (selectedProvince) {
      return getQuartersByProvince(selectedProvince)
    }
    return getAllQuarters()
  }, [selectedCity, selectedProvince, getAllQuarters, getQuartersByCity, getQuartersByProvince])

  const handleSelect = (quarterName: string) => {
    const quarter = quarters.find((q) => q.name === quarterName)
    if (!quarter) return

    // Mettre à jour le formulaire
    setValue('address.district', quarter.name)
    // Coordonnées au niveau racine (utilisées par useOnSubmitFormProperty et la carte)
    setValue('streetLat', quarter.lat)
    setValue('streetLon', quarter.lon)
    
    // IMPORTANT: Mettre à jour longitude et latitude (utilisés par la carte sur la page de détails)
    setValue('longitude', quarter.lon)
    setValue('latitude', quarter.lat)

    // Callback personnalisé
    onSelect?.(quarter.name)
    setOpen(false)
  }

  const selectedQuarterName = selectedQuarter
    ? quarters.find((q) => q.name === selectedQuarter)?.name
    : ''

  // Déterminer le message d'aide selon le contexte
  const placeholder = React.useMemo(() => {
    if (selectedCity) return 'Sélectionner un quartier...'
    if (selectedProvince) return 'Sélectionner un quartier... (ou sélectionnez d\'abord une ville)'
    return 'Sélectionnez d\'abord une province ou une ville'
  }, [selectedCity, selectedProvince])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || (!selectedCity && !selectedProvince)}
        >
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className={cn(!selectedQuarterName && 'text-muted-foreground')}>
              {selectedQuarterName || placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 z-[100]" align="start">
        <Command>
          <CommandInput placeholder="Rechercher un quartier..." className="h-9" />
          <CommandList>
            <CommandEmpty>Aucun quartier trouvé.</CommandEmpty>
            {!selectedCity && !selectedProvince && (
              <CommandGroup heading="Tous les quartiers">
                {quarters.slice(0, 100).map((quarter) => (
                  <CommandItem
                    key={`quarter-${quarter.osmId}-${quarter.lat}-${quarter.lon}`}
                    value={quarter.name}
                    onSelect={() => handleSelect(quarter.name)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedQuarterName === quarter.name ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {quarter.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {(selectedCity || selectedProvince) && (
              <CommandGroup>
                {quarters.map((quarter) => (
                  <CommandItem
                    key={`quarter-${quarter.osmId}-${quarter.lat}-${quarter.lon}`}
                    value={quarter.name}
                    onSelect={() => handleSelect(quarter.name)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedQuarterName === quarter.name ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {quarter.name}
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

