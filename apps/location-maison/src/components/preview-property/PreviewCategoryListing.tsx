'use client'

import React from 'react'
import { CalendarDays, MapPin, Tag as TagIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@trouve-ton-nkama/ui/avatar'
import { Property } from '@/models/annonce'
import { ButtonFavoris } from './ButtonFavoris'
import ButtonShare from './ButtonShare'
import ContactSection from './ContactSection'
import CarouselProperty from './CarouselProperty'
import PropertyStatisticsSummary from '@/components/property/PropertyStatisticsSummary'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useUserByUID } from '@/hooks/use-user-by-uid'
import { getPropertyImageUrls } from '@/lib/property-images'
import { generateColorFromName } from '@/lib/generateColorFromName'
import { formatPublicationDate } from '@/lib/utils'

/**
 * Fiche détail d'une annonce HORS immobilier (Mode, etc.) — gabarit calqué sur celui
 * d'occazGabon (le projet jumeau, référence de style demandée pour Mode) : prix en gros,
 * titre, rangée de chips (état · catégorie · ville · date), description, vendeur, contact.
 *
 * Composant SÉPARÉ de PreviewProperty/PreviewPropertyMobile plutôt qu'une branche de plus
 * dedans : ces deux-là sont construits autour du bien immobilier (carte Google Maps,
 * localisation précise à la rue, bloc chambres/sdb/surface, statut à louer/à vendre) — rien
 * de tout ça n'a de sens pour un parfum ou une robe, et les toucher pour y ajouter des
 * conditions ferait porter le risque sur les 825 annonces immobilières en production.
 *
 * Volontairement ABSENT par rapport à la fiche immobilier :
 * - la carte (locationPrecision = "city" pour ces catégories, les coordonnées sont celles
 *   du chef-lieu de province avec isLocExact:false — une carte donnerait une fausse
 *   impression de précision),
 * - le bloc "Localisation" / additionnalInformation,
 * - le statut À louer/À vendre (`property.status` est absent hors immobilier),
 * - le bloc caractéristiques immobilières.
 */
export default function PreviewCategoryListing({ property }: Readonly<{ property: Property }>) {
  const { user: currentUser } = useCurrentUser()
  const { data: seller } = useUserByUID(property.createdBy)
  const isOwner = property.createdBy === currentUser?.uid

  const images = getPropertyImageUrls(property.images)
  const leafName =
    typeof property.categoryPath?.lvl1 === 'string'
      ? property.categoryPath.lvl1.split(' > ').pop()
      : undefined

  const attributes = property.attributes && typeof property.attributes === 'object' ? property.attributes : {}
  const attributeEntries = Object.entries(attributes).filter(
    ([, value]) => value !== undefined && value !== null && value !== '',
  )
  // `etat` est mis en avant comme chip principal (comme occazGabon) ; les autres attributs
  // (taille, marque…) vont dans le bloc caractéristiques plus bas.
  const etat = typeof attributes.etat === 'string' ? attributes.etat : undefined
  const otherAttributes = attributeEntries.filter(([key]) => key !== 'etat')

  const sellerName = [seller?.firstname, seller?.lastname].filter(Boolean).join(' ') || null
  const avatarBackground = generateColorFromName(seller?.firstname ?? '')

  return (
    <div className="flex flex-col gap-6 pb-24 md:pb-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
        {/* Galerie */}
        <div className="md:sticky md:top-4">
          <CarouselProperty images={images} />
        </div>

        {/* Colonne infos */}
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
                {property.price?.toLocaleString?.('fr-FR') ?? property.price} F CFA
              </p>
              <h1 className="text-lg font-medium text-gray-800 dark:text-gray-100 md:text-xl">
                {property.title}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <ButtonShare property={property} />
              <ButtonFavoris idProperty={property.id!} size={28} source="category_listing_detail" />
            </div>
          </div>

          {/* Chips méta */}
          <div className="flex flex-wrap items-center gap-2">
            {etat && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/20">
                {etat}
              </span>
            )}
            {leafName && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <TagIcon className="h-3 w-3" />
                {leafName}
              </span>
            )}
            {property.city && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <MapPin className="h-3 w-3" />
                {property.city}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <CalendarDays className="h-3 w-3" />
              {formatPublicationDate(property.createdAt)}
            </span>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Description */}
          <section className="flex flex-col gap-2">
            <h2 className="font-bold text-gray-900 dark:text-white">Description</h2>
            {property.description ? (
              <p className="whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">
                {property.description}
              </p>
            ) : (
              <p className="text-sm italic text-gray-400">Le vendeur n&apos;a pas ajouté de description.</p>
            )}
          </section>

          {/* Caractéristiques (attributs de la catégorie, hors état déjà en chip) */}
          {otherAttributes.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="font-bold text-gray-900 dark:text-white">Caractéristiques</h2>
              <dl className="grid grid-cols-2 gap-2">
                {otherAttributes.map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800/50"
                  >
                    <dt className="text-[11px] uppercase tracking-wide text-gray-400">{key}</dt>
                    <dd className="text-sm font-medium text-gray-800 dark:text-gray-200">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* Vendeur */}
          {sellerName && (
            <section className="flex flex-col gap-2">
              <h2 className="font-bold text-gray-900 dark:text-white">Vendeur</h2>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={seller?.image ?? ''} alt={sellerName} />
                  <AvatarFallback style={{ backgroundColor: avatarBackground }} className="text-white">
                    {sellerName.at(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{sellerName}</span>
              </div>
            </section>
          )}

          <ContactSection property={property} />
        </div>
      </div>

      {isOwner && property.id && (
        <PropertyStatisticsSummary propertyId={property.id} property={property} />
      )}
    </div>
  )
}
