'use client';

import { useState, useMemo, useCallback } from 'react';
import { Check, ChevronsUpDown, MapPin, X } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useOSMLocations } from '@/hooks/useOSMLocations';
import { cn } from '@/lib/utils';
import type { QuarterLocation } from '@/providers/MapProvider';

interface QuarterSearchComboboxProps {
  value: QuarterLocation | null;
  onChange: (quarter: QuarterLocation | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function QuarterSearchCombobox({
  value,
  onChange,
  placeholder = "Sélectionner un quartier...",
  disabled = false,
}: QuarterSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const { getAllQuarters, data } = useOSMLocations();
  const quarters = getAllQuarters();

  // Regrouper par province
  const groupedQuarters = useMemo(() => {
    const groups: Record<string, QuarterLocation[]> = {};
    
    for (const quarter of quarters) {
      // Récupérer la province via le mapping
      const province = data?.quarterToProvince?.get(quarter.name) || 'Autres';
      if (!groups[province]) groups[province] = [];
      
      groups[province].push({
        name: quarter.name,
        lat: quarter.lat,
        lon: quarter.lon,
        province: province,
        placeType: quarter.originalType,
      });
    }

    // Trier chaque groupe alphabétiquement
    for (const province of Object.keys(groups)) {
      groups[province].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    }

    return groups;
  }, [quarters, data]);

  // Filtrer par recherche
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groupedQuarters;

    const searchLower = search.toLowerCase();
    const result: Record<string, QuarterLocation[]> = {};

    for (const [province, items] of Object.entries(groupedQuarters)) {
      const filtered = items.filter(q => 
        q.name.toLowerCase().includes(searchLower)
      );
      if (filtered.length > 0) {
        result[province] = filtered;
      }
    }

    return result;
  }, [groupedQuarters, search]);

  const totalResults = useMemo(() => 
    Object.values(filteredGroups).reduce((sum, arr) => sum + arr.length, 0),
    [filteredGroups]
  );

  const handleSelect = useCallback((quarter: QuarterLocation) => {
    onChange(quarter);
    setOpen(false);
    setSearch('');
  }, [onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearch('');
  }, [onChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between h-12 text-left font-normal bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        >
          {value ? (
            <div className="flex items-center gap-2 truncate">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">{value.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          
          <div className="flex items-center gap-1 shrink-0">
            {value && (
              <X 
                className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer" 
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[350px] p-0 z-[1100]" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Rechercher un quartier..." 
            value={search}
            onValueChange={setSearch}
            className="h-11"
          />
          <CommandList className="max-h-[350px]">
            <CommandEmpty>Aucun quartier trouvé.</CommandEmpty>
            
            {Object.entries(filteredGroups)
              .sort(([a], [b]) => a.localeCompare(b, 'fr'))
              .map(([province, items]) => (
                <CommandGroup key={province} heading={province} className="px-2">
                  {items.map((quarter) => (
                    <CommandItem
                      key={`${quarter.name}-${quarter.lat}-${quarter.lon}`}
                      value={quarter.name}
                      onSelect={() => handleSelect(quarter)}
                      className="cursor-pointer py-2"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value?.name === quarter.name ? "opacity-100 text-primary" : "opacity-0"
                        )}
                      />
                      <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                      <span className="truncate">{quarter.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
          </CommandList>
          
          {/* Footer avec compteur */}
          <div className="border-t px-3 py-2 text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800">
            {totalResults} quartier{totalResults > 1 ? 's' : ''} trouvé{totalResults > 1 ? 's' : ''}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
