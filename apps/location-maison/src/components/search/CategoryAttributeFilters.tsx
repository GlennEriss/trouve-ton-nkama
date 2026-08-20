'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { MultiSelect } from '@/components/shared/ui/MultiSelectApp'
import { useAlgoliaCategoryAttributeOptions } from '@/hooks/useAlgoliaFacetOptions'
import type {
  PublishableAttributeField,
  PublishableCategoryLeaf,
} from '@/app/api/categories/publishable-leaves/route'

async function fetchPublishableLeaves(): Promise<PublishableCategoryLeaf[]> {
  const response = await fetch('/api/categories/publishable-leaves')
  if (!response.ok) return []
  const data = await response.json()
  return Array.isArray(data.leaves) ? data.leaves : []
}

// Un champ par sous-composant : useAlgoliaCategoryAttributeOptions doit s'appeler une fois
// par attribut avec un nombre d'appels stable (règle des Hooks) — impossible à faire
// correctement dans une boucle .map() du composant parent.
function AttributeFilterField({
  field,
  categoryId,
  modalPopover,
}: Readonly<{ field: PublishableAttributeField; categoryId: string; modalPopover?: boolean }>) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { options } = useAlgoliaCategoryAttributeOptions(field.key, categoryId)
  const paramKey = `attr_${field.key}`
  const value = searchParams.get(paramKey)?.split(',').filter(Boolean) ?? []

  const handleChange = (nextValues: string[]) => {
    const params = new URLSearchParams(searchParams.toString())
    if (nextValues.length > 0) {
      params.set(paramKey, nextValues.join(','))
    } else {
      params.delete(paramKey)
    }
    router.push(`/search?${params.toString()}`)
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</p>
      <MultiSelect
        options={options}
        value={value}
        onValueChange={handleChange}
        placeholder={field.label}
        variant="inverted"
        animation={2}
        maxCount={3}
        className="rounded-full p-2 h-14 bg-gray-50 dark:bg-gray-900 dark:text-white"
        modalPopover={modalPopover}
      />
    </div>
  )
}

/**
 * Filtres d'attributs générés dynamiquement depuis l'`attributeSchema` de la feuille active
 * (`categoryId` dans l'URL, choisie via CategoryLeafFilterPills) — champs `facetable`
 * seulement, `primary` en premier. Rien de codé en dur par catégorie : une nouvelle feuille
 * (ou un nouvel attribut) apparaît ici sans changement de code, dès qu'elle est marquée
 * facetable côté admin ET déclarée dans attributesForFaceting côté Algolia (voir
 * scripts/algolia-setup-facets.mjs).
 *
 * Même principe URL-first que CategoryFilterPills/CategoryLeafFilterPills : chaque champ
 * écrit `attr_<key>` immédiatement dans l'URL au changement, sans passer par le formulaire
 * immobilier ni son bouton "Appliquer" (voir useFormFilterSearchMediator, qui reporte ces
 * paramètres tel quel plutôt que de les gérer).
 */
export default function CategoryAttributeFilters({
  modalPopover,
}: Readonly<{ modalPopover?: boolean }> = {}) {
  const searchParams = useSearchParams()
  const categoryId = searchParams.get('categoryId') ?? ''

  const { data: leaves = [] } = useQuery({
    queryKey: ['categories', 'publishable-leaves'],
    queryFn: fetchPublishableLeaves,
    staleTime: 1000 * 60 * 10,
  })

  const leaf = leaves.find((candidate) => candidate.id === categoryId)
  if (!leaf) {
    return null
  }

  const facetableFields = leaf.attributeSchema
    .filter((field) => field.facetable)
    .sort((a, b) => Number(b.primary) - Number(a.primary))

  if (facetableFields.length === 0) {
    return null
  }

  return (
    <section className="space-y-5 p-5">
      <h2 className="text-lg font-semibold text-primary dark:text-secondary">
        {leaf.name}
      </h2>
      {facetableFields.map((field) => (
        <AttributeFilterField
          key={field.key}
          field={field}
          categoryId={categoryId}
          modalPopover={modalPopover}
        />
      ))}
    </section>
  )
}
