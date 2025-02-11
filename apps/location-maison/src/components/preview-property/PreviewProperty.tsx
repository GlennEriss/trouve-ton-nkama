import React from 'react'
import Tag from './Tag'
import { GoLocation } from 'react-icons/go'
import CarouselProperty from './CarouselProperty'
import DetailsProperty from './DetailsProperty'
import { Property } from '@/models/annonce'
import { ButtonFavoris } from './ButtonFavoris'

export default function PreviewProperty({ property }: { property: Property }) {
  const tagSatus: Record<string, string> = {
    "FOR_RENT": "A LOUER",
    "FOR_SALE": "A VENDRE"
  }
  const images = property.images.map(img => img.fileURL)
  return (
    <div className='flex flex-col gap-3 bg-[#FDFCFB] p-3 mb-24 md:px-0'>
      <section className='flex justify-between'>
        <div className='flex flex-wrap gap-3 items-center'>
          <Tag name={tagSatus[property.status as string]} />
          {
            property.tags.map((tag, key) => (
              <Tag key={key} name={tag} />
            ))
          }
        </div>
        <div>
          <ButtonFavoris idProperty={property.id!} />
        </div>
      </section>

      <section className='flex flex-col gap-2'>
        <div className='flex flex-col gap-2 md:flex-row md:justify-between'>
          <h1 className='text-2xl font-bold'>{property.title}</h1>
          <h1 className='text-2xl font-bold'>FCFA {property.price}</h1>
        </div>
        <div className='flex items-center gap-2'>
          <GoLocation size={25} />
          <h2 className='text-md text-justify text-gray-500'>{property.street}, {property.city} {property.province}</h2>
        </div>
        <CarouselProperty images={images} />
      </section>


      <section className='flex flex-col gap-2'>
        <div className="flex flex-col gap-3 rounded-lg p-5 shadow">
          <h1 className='font-bold'>Description</h1>
          <p>
            {property.description}
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-lg p-5 shadow">
          <h1 className='font-bold'>Aperçu</h1>
          <p className='flex flex-col text-gray-500 text-sm'>
            <span>Créé le: {property.createdAt?.toDate().toLocaleDateString()}</span>
            <span>Modifié le: {property.updatedAt?.toDate().toLocaleDateString()}</span>
          </p>
          <DetailsProperty property={property as any} />
        </div>
      </section>
    </div>
  )
}
