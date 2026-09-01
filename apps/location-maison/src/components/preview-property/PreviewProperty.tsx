'use client'
import React from 'react'
import Tag from './Tag'
import { GoLocation } from 'react-icons/go'
import CarouselProperty from './CarouselProperty'
import DetailsProperty from './DetailsProperty'
import { Property } from '@/models/annonce'
import { ButtonFavoris } from './ButtonFavoris'
import ContactSection from './ContactSection'
import GiftSection from './GiftSection'
import { MapSection } from './MapSection'
import ButtonShare from './ButtonShare'
import { AlertTriangle } from 'lucide-react'
import PropertyStatisticsSummary from '@/components/property/PropertyStatisticsSummary'
import { useCurrentUser } from '@/hooks/use-current-user'
import { getPrimaryPropertyImageUrl, getPropertyImageUrls } from '@/lib/property-images'

export default function PreviewProperty({ property }: Readonly<{ property: Property }>) {
  const { user } = useCurrentUser()
  const isOwner = property.createdBy === user?.uid

  const tagSatus: Record<string, string> = {
    "FOR_RENT": "A LOUER",
    "FOR_SALE": "A VENDRE"
  }
  const images = getPropertyImageUrls(property.images)
  const primaryImageUrl = getPrimaryPropertyImageUrl(property.images)

  return (
    <div className='flex flex-col gap-8 bg-gray-50 dark:bg-gray-950 mb-24 max-w-full overflow-x-hidden'>
      {/* En-tête : tags et actions */}
      <div className='px-4 md:px-20 pt-4 flex justify-between items-center gap-4'>
        <div className='flex flex-wrap gap-3 items-center'>
          {tagSatus[property.status as string] && <Tag name={tagSatus[property.status as string]} />}
          {property.tags.map((tag) => (
            <Tag key={tag} name={tag} />
          ))}
        </div>
        <div className='flex gap-2 items-center flex-shrink-0'>
          <ButtonShare property={property} />
          <ButtonFavoris idProperty={property.id!} />
        </div>
      </div>

      {/* Section principale : 2 colonnes en desktop */}
      <div className='px-4 md:px-20 grid grid-cols-1 md:grid-cols-[1fr_400px] gap-8 lg:gap-12'>
        {/* Colonne gauche : Photo et galerie */}
        <div className='flex flex-col gap-4'>
          <CarouselProperty images={images} />
        </div>

        {/* Colonne droite : Infos essentielles et contact */}
        <div className='flex flex-col gap-6'>
          {/* Titre et prix */}
          <div className='flex flex-col gap-2'>
            <h1 className='text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white break-words'>
              {property.title}
            </h1>
            <div className='text-2xl lg:text-3xl font-bold text-green-600 dark:text-green-500'>
              FCFA {property.price.toLocaleString('fr-FR')}
            </div>
          </div>

          {/* Localisation */}
          <div className='flex items-start gap-2'>
            <GoLocation size={20} className='text-red-600 flex-shrink-0 mt-0.5' />
            <p className='text-sm md:text-base text-gray-600 dark:text-gray-400'>
              {property.street}, {property.city} {property.province}
            </p>
          </div>

          {/* Dates */}
          <div className='text-xs text-gray-500 dark:text-gray-400 space-y-1 pt-2 border-t border-gray-200 dark:border-gray-700'>
            <p>
              Créé le: {property.createdAt ? new Date(property.createdAt.seconds * 1000).toLocaleDateString('fr-FR', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }) : 'Date inconnue'}
            </p>
            <p>
              Modifié le: {property.updatedAt ? new Date(property.updatedAt.seconds * 1000).toLocaleDateString('fr-FR', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }) : 'Date inconnue'}
            </p>
          </div>

          {/* Section contact minimaliste */}
          <ContactSection property={property} />
          <GiftSection property={property} />
        </div>
      </div>

      {/* Alerte propriété archivée */}
      {property.state === 'ARCHIVED' && (
        <section className="px-4 md:px-20">
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 shadow-md">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                Propriété non disponible
              </h3>
              <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                Cette propriété n'est plus disponible à la location ou à la vente.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Section bas : contenu en pleine largeur */}
      <div className='px-4 md:px-20 flex flex-col gap-6'>
        {/* Description */}
        <section className='flex flex-col gap-3'>
          <h2 className='text-xl font-bold text-gray-900 dark:text-white'>Description</h2>
          <div className='bg-white dark:bg-gray-800 rounded-lg p-5 shadow'>
            <p className='text-gray-700 dark:text-gray-300 leading-relaxed'>
              {property.description}
            </p>
          </div>
        </section>

        {/* Aperçu / Caractéristiques */}
        <section className='flex flex-col gap-3'>
          <h2 className='text-xl font-bold text-gray-900 dark:text-white'>Aperçu</h2>
          <div className='bg-white dark:bg-gray-800 rounded-lg p-5 shadow'>
            <DetailsProperty property={property as any} />
          </div>
        </section>

        {/* Localisation additionnelle */}
        {property.additionnalInformation && (
          <section className='flex flex-col gap-3'>
            <h2 className='text-xl font-bold text-gray-900 dark:text-white'>Localisation</h2>
            <div className='bg-white dark:bg-gray-800 rounded-lg p-5 shadow'>
              <p className='text-gray-700 dark:text-gray-300 leading-relaxed'>
                {property.additionnalInformation}
              </p>
            </div>
          </section>
        )}

        {/* Carte */}
        <MapSection
          image={primaryImageUrl}
          additionalInformation={property?.additionnalInformation}
          street={property.street}
          city={property.city}
          province={property.province}
          latitude={property.latitude}
          longitude={property.longitude}
          countryCode={property.countryCode}
        />

        {/* Statistiques pour le propriétaire */}
        {isOwner && property.id && (
          <PropertyStatisticsSummary
            propertyId={property.id}
            property={property}
          />
        )}
      </div>
    </div>
  )
}
