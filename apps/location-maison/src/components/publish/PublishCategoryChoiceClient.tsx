'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Building2, Loader2, Shirt, Tag } from 'lucide-react'
import { Card } from '@trouve-ton-nkama/ui/card'
import { routes } from '@/constantes/routes'

type ActiveCategory = {
  id: string
  slug: string
  name: string
  icon: string | null
  order: number
}

async function fetchActiveRootCategories(): Promise<ActiveCategory[]> {
  const response = await fetch('/api/categories/active')
  if (!response.ok) return []
  const data = await response.json()
  return Array.isArray(data.categories) ? data.categories : []
}

function resolveCreateHref(slug: string): string {
  // L'immobilier garde son propre formulaire (14 builders existants, voir
  // docs/marketplace-multi-categories/07-lots-et-sequencement.md, Lot 10 non fait) ;
  // toute autre catégorie racine passe par le moteur générique piloté par schéma.
  return slug === 'immobilier' ? routes.protected.add_property_ai : routes.protected.add_category_listing
}

function resolveIcon(slug: string) {
  if (slug === 'immobilier') return Building2
  if (slug === 'mode') return Shirt
  return Tag
}

/**
 * Choix de catégorie affiché entre "/publish" et le formulaire de création — voir
 * docs/marketplace-multi-categories/07-lots-et-sequencement.md. Ne liste que les
 * catégories racine ACTIVES (GET /api/categories/active, même source que
 * CategoryFilterPills/CategoryHomeSections). Si une seule racine est active (état actuel
 * en prod : Mode inactive), on saute directement l'étape plutôt que d'imposer un clic sur
 * un choix unique — zéro régression sur le parcours immobilier actuel.
 */
export default function PublishCategoryChoiceClient() {
  const router = useRouter()

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', 'active-roots'],
    queryFn: fetchActiveRootCategories,
    staleTime: 1000 * 60 * 10,
  })

  const singleTarget = useMemo(
    () => (categories.length === 1 ? resolveCreateHref(categories[0].slug) : null),
    [categories],
  )

  useEffect(() => {
    if (singleTarget) {
      router.replace(singleTarget)
    }
  }, [singleTarget, router])

  if (isLoading || singleTarget) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Que veux-tu publier ?</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Choisis une catégorie</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
        {categories.map((category) => {
          const Icon = resolveIcon(category.slug)
          return (
            <Link key={category.id} href={resolveCreateHref(category.slug)} className="block h-full">
              <Card className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all">
                <Icon className="h-10 w-10 text-emerald-600" />
                <p className="font-semibold text-slate-800 dark:text-slate-100">{category.name}</p>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
