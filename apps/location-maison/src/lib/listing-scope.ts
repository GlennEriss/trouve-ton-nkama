import { Building2, ShoppingBag, type LucideIcon } from 'lucide-react'
import type { CategoryPath, Property } from '@/models/annonce'
import type { Reel } from '@/models/reel'

/**
 * Un réel n'a jamais de catégorie choisie directement — il hérite de celle de l'annonce à
 * laquelle il est rattaché (categoryPath, copié côté serveur par attachReelToProperty). Rien
 * dans le parcours de création/rattachement d'un réel ne montrait cette catégorie avant,
 * laissant l'annonceur deviner si son réel finirait classé "Immobilier" ou "Mode" dans le fil
 * public — demande directe d'un utilisateur qui ne voyait pas comment le savoir.
 *
 * Même discriminant que resolveScope() côté serveur (/api/announcer/ads/route.ts) :
 * `categoryId` n'est PAS fiable (un backfill l'a posé sur presque toutes les annonces,
 * immobilier comprise) — seul `typeProperty`, jamais renseigné pour une annonce Mode, l'est.
 */
export function resolveListingScopeLabel(property: Pick<Property, 'typeProperty'>): {
  label: string
  icon: LucideIcon
} {
  return property.typeProperty
    ? { label: 'Immobilier', icon: Building2 }
    : { label: 'Mode', icon: ShoppingBag }
}

/**
 * Même besoin, pour une carte de réel déjà publié (MyReelsClient.tsx) — mais le réel lui-même
 * n'a pas de `typeProperty` (uniquement les annonces l'ont), seulement le `categoryPath` copié
 * au rattachement. `null` si absent (réel orphelin, ou rattaché à une annonce immobilier trop
 * ancienne pour avoir reçu ce champ lors du backfill, voir le commentaire sur `categoryId` dans
 * `Property`) : afficher "Immobilier" par déduction serait faux dans ce second cas — ni le
 * badge ici ni le filtre par onglet du fil public (`categoryPath.lvl0`, reel.db.ts) ne peuvent
 * mieux faire que ce que ce champ contient réellement.
 */
export function resolveReelScopeLabel(reel: Pick<Reel, 'categoryPath'>): {
  label: string
  icon: LucideIcon
} | null {
  const lvl0 = reel.categoryPath?.lvl0
  if (!lvl0) return null
  return lvl0 === 'Mode' ? { label: 'Mode', icon: ShoppingBag } : { label: lvl0, icon: Building2 }
}

/**
 * categoryPath à copier sur un réel qui hérite d'une annonce (création avec propertyId, ou
 * rattachement a posteriori dans /api/reels/route.ts). Une annonce immobilier n'a JAMAIS son
 * propre `categoryPath` en base — le seul endroit qui écrit ce champ dans tout le code est le
 * flux Mode (category-listing/create/page.tsx). Sans ce repli, `property.categoryPath` était
 * toujours `undefined` pour du réel immobilier, donc aucun réel qui lui était rattaché ne
 * recevait jamais `categoryPath.lvl0 = 'Immobilier'` — et l'onglet "Immobilier" du fil public
 * (getPublicReels({categoryRootName}), reel.db.ts) restait donc structurellement vide, quel que
 * soit le nombre de réels réellement immobilier. Repéré en ajoutant le chip de catégorie directe
 * sur l'écran de création (CreateOrphanReelClient.tsx) : nécessitait de comprendre précisément
 * cette mécanique pour choisir la bonne valeur à écrire.
 */
export function resolveCategoryPathForProperty(
  property: Pick<Property, 'typeProperty' | 'categoryPath'>
): CategoryPath | undefined {
  if (property.categoryPath) return property.categoryPath
  return property.typeProperty ? { lvl0: 'Immobilier' } : undefined
}
