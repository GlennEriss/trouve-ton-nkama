'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import CarouselProperty from './CarouselProperty'
import { Property } from '@/models/annonce'
import { Button } from '@trouve-ton-nkama/ui/button'
import { EditableField } from '@/components/shared/EditableField'
import { updateProperty } from '@/db/property.db'
import { getPropertyImageUrls } from '@/lib/property-images'
import { routes } from '@/constantes/routes'

/**
 * Brouillon éditable d'une annonce multi-catégorie fraîchement créée par l'IA
 * (`/category-listing/create/preview/[id]`) — même principe que
 * `PreviewPropertyDraft.tsx` (pendant immobilier) : l'annonce existe déjà en base
 * (moderationStatus 'PENDING'), chaque sauvegarde ici est un simple `updateProperty`,
 * pas de bouton "Publier" séparé. Les attributs affichés viennent de `property.attributes`
 * tel que rempli par l'IA — pas de re-résolution du schéma de catégorie ici, l'édition
 * sert de filet de rattrapage, pas de saisie structurée initiale.
 */
export default function PreviewCategoryListingDraft({ property: initialProperty }: Readonly<{ property: Property }>) {
  const router = useRouter()
  const [property, setProperty] = useState(initialProperty)

  const images = getPropertyImageUrls(property.images)
  const attributes = (property.attributes ?? {}) as Record<string, string | number | boolean>

  const saveField = async (patch: Partial<Property>) => {
    const ok = await updateProperty(property.id!, patch)
    if (!ok) {
      throw new Error('La mise à jour a échoué. Réessaie.')
    }
    setProperty((previous) => ({ ...previous, ...patch }))
  }

  const saveAttribute = (key: string, value: string) => {
    return saveField({ attributes: { ...attributes, [key]: value } })
  }

  const goToMyListings = () => router.push(`${routes.protected.properties}?submitted=1`)

  return (
    <div className="flex flex-col gap-3 bg-gray-50 dark:bg-gray-950 p-3 mb-24 md:px-0 max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 sm:flex-row sm:items-center sm:justify-between">
        <span>
          <strong>Ton annonce est déjà enregistrée</strong> et sera examinée par notre équipe avant
          publication — rien d&apos;autre à « valider ». Corrige ce qui te semble faux avec les
          crayons ci-dessous, puis termine quand tu es satisfait.
        </span>
        <Button onClick={goToMyListings} className="shrink-0 gap-1.5">
          <CheckCircle2 className="h-4 w-4" /> Terminé — voir mes annonces
        </Button>
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 md:flex-row md:justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            <EditableField value={property.title} onSave={(value) => saveField({ title: value })} />
          </h1>
          <h1 className="text-2xl font-bold text-green-700">
            FCFA{' '}
            <EditableField
              value={String(property.price)}
              type="number"
              onSave={(value) => saveField({ price: Number(value) || 0 })}
              renderValue={(value) => Number(value).toLocaleString('fr-FR')}
            />
          </h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {property.categoryPath ? `${property.categoryPath.lvl1}` : ''}
        </p>
        <CarouselProperty images={images} />
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex flex-col gap-3 rounded-lg p-5 shadow dark:shadow-gray-800 dark:bg-gray-800 dark:text-white">
          <h1 className="font-bold">Description</h1>
          <p className="text-gray-700 dark:text-gray-300">
            <EditableField
              value={property.description}
              type="textarea"
              onSave={(value) => saveField({ description: value })}
            />
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-lg p-5 shadow dark:shadow-gray-800 dark:bg-gray-800 dark:text-white">
          <h1 className="font-bold">Localisation</h1>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Ville</p>
              <EditableField value={property.city} onSave={(value) => saveField({ city: value })} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Province</p>
              <EditableField value={property.province} onSave={(value) => saveField({ province: value })} />
            </div>
          </div>
        </div>

        {Object.keys(attributes).length > 0 && (
          <div className="flex flex-col gap-3 rounded-lg p-5 shadow dark:shadow-gray-800 dark:bg-gray-800 dark:text-white">
            <h1 className="font-bold">Caractéristiques</h1>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(attributes).map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs font-medium capitalize text-gray-500 dark:text-gray-400">{key}</p>
                  <EditableField value={String(value)} onSave={(newValue) => saveAttribute(key, newValue)} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-lg p-5 shadow dark:shadow-gray-800 dark:bg-gray-800 dark:text-white">
          <h1 className="font-bold">Numéros de contact</h1>
          <div className="flex flex-col gap-3 text-gray-700 dark:text-gray-300">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Numéro principal</p>
              <EditableField value={property.contact ?? ''} onSave={(value) => saveField({ contact: value.trim() })} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                WhatsApp (si différent — sinon le numéro principal est utilisé)
              </p>
              <EditableField
                value={property.whatsappContact ?? ''}
                onSave={(value) => saveField({ whatsappContact: value.trim() })}
              />
            </div>
          </div>
        </div>

        <Button onClick={goToMyListings} size="lg" className="self-center gap-1.5">
          <CheckCircle2 className="h-4 w-4" /> Terminé — voir mes annonces
        </Button>
      </section>
    </div>
  )
}
