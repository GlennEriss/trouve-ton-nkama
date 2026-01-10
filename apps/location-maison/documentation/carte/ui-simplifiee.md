# Interface Simplifiée de la Carte Interactive

## Décision UX

> **Pas de barre de recherche séparée** - Le combobox de quartiers avec recherche intégrée est suffisant.

---

## Comparaison des approches

### ❌ Approche rejetée : Barre de recherche + Combobox

```
┌─────────────────────────────────────────┐
│  🔍 Rechercher un logement...           │  ← INUTILE
│  ────────────────────────────────────   │
│                                         │
│  Province: [Combobox]                   │  ← Redondant
│  Ville: [Combobox]                      │  ← Redondant  
│  Quartier: [Combobox]                   │
│                                         │
│  Résultats...                           │
└─────────────────────────────────────────┘

Problèmes:
- Duplication de fonctionnalité
- Confusion utilisateur
- Interface surchargée
```

### ✅ Approche retenue : Combobox unique avec recherche intégrée

```
┌─────────────────────────────────────────┐
│                                         │
│  📍 Sélectionner un quartier            │
│  ┌─────────────────────────────────┐    │
│  │ 🔍 Rechercher...            ▼  │    │  ← UNIQUE POINT D'ENTRÉE
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Quartier: Bas de Gué Gué        │    │
│  │ Province: Estuaire              │    │
│  │ 15 logements disponibles        │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Résultats                              │
│  ────────────────────────────────────   │
│  ┌─────────┐ ┌─────────┐               │
│  │ 🏠      │ │ 🏠      │               │
│  │ Studio  │ │ Appart. │               │
│  │ 250k    │ │ 350k    │               │
│  └─────────┘ └─────────┘               │
│                                         │
└─────────────────────────────────────────┘

Avantages:
- Interface épurée
- Un seul point d'interaction
- Flux utilisateur clair
```

---

## Spécifications du Combobox de Quartiers

### Fonctionnalités requises

| Fonctionnalité | Description |
|----------------|-------------|
| **Recherche intégrée** | Filtrage en temps réel pendant la saisie |
| **Tri alphabétique** | Quartiers triés de A à Z |
| **Regroupement par province** | Sections visuelles par province |
| **Virtualisation** | Performance avec 1,276 quartiers |
| **Debounce** | 150ms avant filtrage (performance) |

### Structure des données

```typescript
interface QuarterOption {
  // Identification
  name: string;           // "Bas de Gué Gué"
  province: string;       // "Estuaire"
  city?: string;          // "Libreville"
  
  // Coordonnées pour centrage carte
  lat: number;
  lon: number;
  
  // Métadonnées OSM
  osmType: string;        // "suburb" | "village" | etc.
  osmId: string;          // "node/12345"
}
```

### Design du Combobox

```
État fermé:
┌─────────────────────────────────────────────┐
│ 🔍 Sélectionner un quartier...           ▼ │
└─────────────────────────────────────────────┘

État ouvert (avec recherche "akebe"):
┌─────────────────────────────────────────────┐
│ 🔍 akebe                                  × │
├─────────────────────────────────────────────┤
│                                             │
│ ESTUAIRE                                    │
│ ─────────────────────────────────────────── │
│   📍 Akébé Plaine                          │
│   📍 Akébé Poteau                          │
│   📍 Akébé-Ville                           │
│   📍 Akébé-Kinguélé                        │
│                                             │
│ 4 résultats                                │
└─────────────────────────────────────────────┘

État sélectionné:
┌─────────────────────────────────────────────┐
│ 📍 Akébé Plaine                          × │
└─────────────────────────────────────────────┘
```

---

## Composant QuarterSearchCombobox

### Props

```typescript
interface QuarterSearchComboboxProps {
  // Valeur sélectionnée
  value: QuarterOption | null;
  onChange: (quarter: QuarterOption | null) => void;
  
  // Customisation
  placeholder?: string;
  disabled?: boolean;
  
  // Callbacks optionnels
  onSearchChange?: (search: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
}
```

### Implémentation suggérée

```tsx
// src/components/interactive-map/QuarterSearchCombobox.tsx

'use client';

import { useState, useMemo, useCallback } from 'react';
import { Check, ChevronsUpDown, MapPin, X } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useOSMLocations } from '@/hooks/useOSMLocations';
import { cn } from '@/lib/utils';

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
    const groups: Record<string, QuarterOption[]> = {};
    
    for (const quarter of quarters) {
      const province = data?.quarterToProvince.get(quarter.name) || 'Autres';
      if (!groups[province]) groups[province] = [];
      groups[province].push(quarter);
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
    const result: Record<string, QuarterOption[]> = {};

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

  const handleSelect = useCallback((quarter: QuarterOption) => {
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
          className="w-full justify-between h-12 text-left font-normal"
        >
          {value ? (
            <div className="flex items-center gap-2 truncate">
              <MapPin className="h-4 w-4 text-[#146B67] shrink-0" />
              <span className="truncate">{value.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          
          <div className="flex items-center gap-1 shrink-0">
            {value && (
              <X 
                className="h-4 w-4 text-gray-400 hover:text-gray-600" 
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Rechercher un quartier..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[400px]">
            <CommandEmpty>Aucun quartier trouvé.</CommandEmpty>
            
            {Object.entries(filteredGroups)
              .sort(([a], [b]) => a.localeCompare(b, 'fr'))
              .map(([province, items]) => (
                <CommandGroup key={province} heading={province}>
                  {items.map((quarter) => (
                    <CommandItem
                      key={`${quarter.name}-${quarter.lat}-${quarter.lon}`}
                      value={quarter.name}
                      onSelect={() => handleSelect(quarter)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value?.name === quarter.name ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                      {quarter.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
          </CommandList>
          
          {/* Footer avec compteur */}
          <div className="border-t px-3 py-2 text-xs text-muted-foreground">
            {totalResults} quartier{totalResults > 1 ? 's' : ''} trouvé{totalResults > 1 ? 's' : ''}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

---

## Layout Final de la Sidebar

```
┌─────────────────────────────────────────┐
│                                         │
│  🗺️ Carte du Gabon                      │  ← Titre
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  📍 Sélectionner un quartier            │  ← Label
│  ┌─────────────────────────────────┐    │
│  │ 🔍 Akébé Plaine              × │    │  ← Combobox UNIQUE
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Akébé Plaine                    │    │  ← Info quartier sélectionné
│  │ Province: Estuaire              │    │
│  │ Ville: Libreville               │    │
│  │ 📊 15 logements disponibles     │    │
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  Logements disponibles                  │  ← Section résultats
│  ────────────────────────────────────   │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 🏠 Studio meublé               │    │
│  │ Akébé Plaine                    │    │
│  │ 💰 250 000 FCFA/mois           │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 🏠 Appartement T3              │    │
│  │ Akébé Plaine                    │    │
│  │ 💰 350 000 FCFA/mois           │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ... (scroll)                           │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │      Voir tous les résultats    │    │  ← Bouton optionnel
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

---

## Interactions Carte ↔ Combobox

### Sélection via Combobox

```
1. Utilisateur tape "Bas de" dans le combobox
2. Liste filtrée: "Bas de Gué Gué"
3. Utilisateur clique sur "Bas de Gué Gué"
4. → Combobox se ferme avec valeur sélectionnée
5. → Carte zoom sur le quartier
6. → Polygone devient vert
7. → Résultats chargés (cache ou API)
8. → Sidebar affiche les logements
```

### Sélection via Click sur Carte

```
1. Utilisateur clique sur un polygone de la carte
2. → Polygone devient vert
3. → Combobox mis à jour avec le quartier cliqué
4. → Résultats chargés (cache ou API)
5. → Sidebar affiche les logements
```

### Synchronisation bidirectionnelle

```typescript
// Dans le composant parent (InteractiveMapPage)

const [selectedQuarter, setSelectedQuarter] = useState<QuarterOption | null>(null);

// Quand on sélectionne via combobox
const handleComboboxChange = (quarter: QuarterOption | null) => {
  setSelectedQuarter(quarter);
  // La carte réagira via useEffect
};

// Quand on clique sur la carte
const handleMapQuarterClick = (quarter: QuarterOption) => {
  setSelectedQuarter(quarter);
  // Le combobox sera mis à jour automatiquement
};

return (
  <>
    <MapSidebar>
      <QuarterSearchCombobox 
        value={selectedQuarter}
        onChange={handleComboboxChange}
      />
      <MapResultsList quarterName={selectedQuarter?.name} />
    </MapSidebar>
    
    <LeafletMap
      selectedQuarter={selectedQuarter}
      onQuarterClick={handleMapQuarterClick}
    />
  </>
);
```

---

## Résumé des décisions UI

| Élément | Décision |
|---------|----------|
| Barre de recherche texte | ❌ Supprimée (inutile) |
| Combobox Province | ❌ Supprimé (pas nécessaire) |
| Combobox Ville | ❌ Supprimé (pas nécessaire) |
| **Combobox Quartier** | ✅ **UNIQUE élément de sélection** |
| Recherche dans combobox | ✅ Intégrée |
| Tri alphabétique | ✅ Oui |
| Regroupement par province | ✅ Oui (visuel uniquement) |
