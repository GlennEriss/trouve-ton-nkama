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

export default function PreviewProperty({ property }: Readonly<{ property: Property }>) {
  const tagSatus: Record<string, string> = {
    "FOR_RENT": "A LOUER",
    "FOR_SALE": "A VENDRE"
  }
  const images = property.images.map(img => img.fileURL)

  return (
    <div className='flex flex-col gap-3 bg-[#FDFCFB] dark:bg-[#020817] p-3 mb-24 md:px-0'>
      {/* Section des tags */}
      <section className='flex justify-between'>
        <div className='flex flex-wrap gap-3 items-center'>
          <Tag name={tagSatus[property.status as string]} />
          {
            property.tags.map((tag, key) => (
              <Tag key={key} name={tag} />
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
          image={property.images[0].fileURL}
          additionalInformation={property?.additionnalInformation}
          street={property.street}
          city={property.city}
          province={property.province}
          latitude={property.latitude}
          longitude={property.longitude}
          countryCode={property.countryCode}
        />
      </section>
    </div>
  )
}