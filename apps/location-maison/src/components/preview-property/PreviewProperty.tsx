'use client'
import React from 'react'
import Tag from './Tag'
import { GoLocation } from 'react-icons/go'
import CarouselProperty from './CarouselProperty'
import DetailsProperty from './DetailsProperty'
import { Property } from '@/models/annonce'
import { ButtonFavoris } from './ButtonFavoris'
import ContactSection from './ContactSection'
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
    <div className='flex flex-col gap-3 bg-gray-50 dark:bg-gray-950 p-3 mb-24 md:px-0 max-w-full overflow-x-hidden'>
      {/* Section des tags */}
      <section className='flex justify-between'>
        <div className='flex flex-wrap gap-3 items-center'>
          <Tag name={tagSatus[property.status as string]} />
          {
            property.tags.map((tag) => (
              <Tag key={tag} name={tag} />
            ))
          }
        </div>
        <div className=''>
          <div className='flex gap-2 items-center'>
            <ButtonShare property={property} />
            <ButtonFavoris idProperty={property.id!} />
          </div>
        </div>
      </section>

      {/* Section des informations principales */}
      <section className='flex flex-col gap-2'>
        <div className='flex flex-col gap-2 md:flex-row md:justify-between'>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>{property.title}</h1>
          <h1 className='text-2xl font-bold text-green-700'>
            FCFA {property.price.toLocaleString('fr-FR')}
          </h1>
        </div>
        <div className='flex items-center gap-2'>
          <GoLocation size={25} className='text-red-600' />
          <h2 className='text-[13px] md:text-lg text-justify text-gray-500 dark:text-gray-400'>{property.street}, {property.city} {property.province}</h2>
        </div>
        <CarouselProperty images={images} />
      </section>

      {/* Alerte propriété archivée */}
      {property.state === 'ARCHIVED' && (
        <section className="mx-3 md:mx-0">
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

      {/* Section description */}
      <section className='flex flex-col gap-2'>
        <div className="flex flex-col gap-3 rounded-lg p-5 shadow dark:shadow-gray-800 dark:bg-gray-800 dark:text-white">
          <h1 className='font-bold'>Description</h1>
          <p className='text-gray-700 dark:text-gray-300'>
            {property.description}
          </p>
        </div>

        {/* Section aperçu */}
        <section className="flex flex-col gap-3 rounded-lg p-5 shadow dark:shadow-gray-800 dark:bg-gray-800 dark:text-white">
          <h1 className='font-bold'>Aperçu</h1>
          <p className='flex flex-col text-gray-500 dark:text-gray-400 text-sm text-justify italic'>
            <span>
              Créé le: {property.createdAt ? new Date(property.createdAt.seconds * 1000).toLocaleDateString('fr-FR', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }) : 'Date inconnue'}
            </span>
            <span>
              Modifié le: {property.updatedAt ? new Date(property.updatedAt.seconds * 1000).toLocaleDateString('fr-FR', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }) : 'Date inconnue'}
            </span>
          </p>
          <DetailsProperty property={property as any} />
        </section>

        {/* Section contact */}
        <ContactSection property={property} />

        {/* Section localisation */}
        {
          property.additionnalInformation && (
            <section className="flex flex-col gap-3 rounded-lg p-5 shadow dark:shadow-gray-800 dark:bg-gray-800 dark:text-white">
              <h1 className='font-bold'>Localisation</h1>
              <p className='text-gray-700 dark:text-gray-300'>
                {property.additionnalInformation}
              </p>
            </section>
          )
        }

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

        {/* Section Statistiques - Visible uniquement pour le propriétaire */}
        {isOwner && property.id && (
          <PropertyStatisticsSummary 
            propertyId={property.id}
            property={property}
          />
        )}
      </section>
    </div>
  )
}
