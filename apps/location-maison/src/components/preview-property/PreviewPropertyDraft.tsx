'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, CheckCircle2 } from 'lucide-react'
import Tag from './Tag'
import { GoLocation } from 'react-icons/go'
import CarouselProperty from './CarouselProperty'
import DetailsProperty from './DetailsProperty'
import { Property } from '@/models/annonce'
import ContactSection from './ContactSection'
import { MapSection } from './MapSection'
import { Button } from '@trouve-ton-nkama/ui/button'
import { EditableField } from '@/components/shared/EditableField'
import { updateProperty } from '@/db/property.db'
import { getPrimaryPropertyImageUrl, getPropertyImageUrls } from '@/lib/property-images'
import { routes } from '@/constantes/routes'

const MAX_ADDITIONAL_CONTACTS = 4

/**
 * Page preview + édition champ par champ pour une annonce immobilière —
 * même gabarit visuel que `PreviewProperty.tsx` (la page annonce réelle),
 * avec un crayon d'édition sur chaque attribut simple. Sert à la fois :
 *  - juste après création (`/property/create/preview/[id]`), moderationStatus
 *    'PENDING' ;
 *  - au clic sur "Modifier" depuis la gestion des annonces, quelle que soit
 *    l'annonce (APPROVED déjà en ligne, ou REJECTED) — remplace l'ancien
 *    formulaire à 14 builders (`property/modify/[id]`), décision produit
 *    explicite. Le bandeau ci-dessous s'adapte à `moderationStatus` pour ne
 *    pas prétendre à une annonce déjà en ligne qu'elle "vient d'être créée".
 *  Toute sauvegarde sur une annonce REJECTED la repasse automatiquement en
 *  PENDING (même logique que `PreviewCategoryListingDraft.tsx` pour Mode).
 */
export default function PreviewPropertyDraft({ property: initialProperty }: Readonly<{ property: Property }>) {
  const router = useRouter()
  const [property, setProperty] = useState(initialProperty)

  const isRejected = property.moderationStatus === 'REJECTED'
  const isPending = property.moderationStatus === 'PENDING'

  const tagSatus: Record<string, string> = {
    FOR_RENT: 'A LOUER',
    FOR_SALE: 'A VENDRE',
  }
  const images = getPropertyImageUrls(property.images)
  const primaryImageUrl = getPrimaryPropertyImageUrl(property.images)

  const saveField = async (patch: Partial<Property>) => {
    const finalPatch: Omit<Partial<Property>, 'rejectionReason'> & { rejectionReason?: string | null } = isRejected
      ? { ...patch, moderationStatus: 'PENDING', rejectionReason: null }
      : patch
    const ok = await updateProperty(property.id!, finalPatch as Partial<Property>)
    if (!ok) {
      throw new Error("La mise à jour a échoué. Réessaie.")
    }
    setProperty((prev) => ({ ...prev, ...finalPatch }) as Property)
  }

  const additionalContacts = property.additionalContacts ?? []
  const saveAdditionalContactAt = (index: number, value: string) => {
    const next = [...additionalContacts]
    next[index] = value.trim()
    return saveField({ additionalContacts: next })
  }
  const removeAdditionalContactAt = (index: number) => {
    saveField({ additionalContacts: additionalContacts.filter((_, i) => i !== index) })
  }
  const addAdditionalContact = () => {
    saveField({ additionalContacts: [...additionalContacts, ''] })
  }

  const goToMyListings = () => router.push(`${routes.protected.properties}?submitted=1`)

  return (
    <div className="flex flex-col gap-3 bg-gray-50 dark:bg-gray-950 p-3 mb-24 md:px-0 max-w-full overflow-x-hidden">
      {isRejected ? (
        <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex flex-col gap-1">
            <span>
              <strong>Cette annonce a été rejetée.</strong> Corrige ce qui pose problème avec les
              crayons ci-dessous — la première modification la renvoie automatiquement en review,
              gratuitement.
            </span>
            {property.rejectionReason && (
              <span>
                Motif : <strong>{property.rejectionReason}</strong>
              </span>
            )}
          </span>
          <Button onClick={goToMyListings} className="shrink-0 gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> Terminé — voir mes annonces
          </Button>
        </div>
      ) : isPending ? (
        <div className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 sm:flex-row sm:items-center sm:justify-between">
          <span>
            <strong>Ton annonce est déjà enregistrée</strong> et sera examinée par notre équipe avant
            publication — rien d&apos;autre à “valider”. Corrige ce qui te semble faux avec les
            crayons ci-dessous, puis termine quand tu es satisfait.
          </span>
          <Button onClick={goToMyListings} className="shrink-0 gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> Terminé — voir mes annonces
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 sm:flex-row sm:items-center sm:justify-between">
          <span>Modifie ce que tu veux avec les crayons ci-dessous — chaque champ s&apos;enregistre séparément.</span>
          <Button onClick={goToMyListings} className="shrink-0 gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> Terminé — voir mes annonces
          </Button>
        </div>
      )}

      {/* Section des tags */}
      <section className="flex justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <Tag name={tagSatus[property.status as string]} />
          {(property.tags ?? []).map((tag) => (
            <Tag key={tag} name={tag} />
          ))}
        </div>
      </section>

      {/* Section des informations principales */}
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
        <div className="flex items-center gap-2">
          <GoLocation size={25} className="text-red-600" />
          <h2 className="text-[13px] md:text-lg text-justify text-gray-500 dark:text-gray-400">
            {property.street}, {property.city} {property.province}
          </h2>
        </div>
        <CarouselProperty images={images} />
      </section>

      {/* Section description */}
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

        <section className="flex flex-col gap-3 rounded-lg p-5 shadow dark:shadow-gray-800 dark:bg-gray-800 dark:text-white">
          <h1 className="font-bold">Aperçu</h1>
          <p className="flex flex-col text-gray-500 dark:text-gray-400 text-sm text-justify italic">
            <span>
              Créé le:{' '}
              {property.createdAt
                ? new Date(property.createdAt.seconds * 1000).toLocaleDateString('fr-FR', {
                    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
                  })
                : 'Date inconnue'}
            </span>
          </p>
          <DetailsProperty property={property as any} />
        </section>

        <section className="flex flex-col gap-3 rounded-lg p-5 shadow dark:shadow-gray-800 dark:bg-gray-800 dark:text-white">
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
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Appel (si différent — sinon le numéro principal est utilisé)
              </p>
              <EditableField
                value={property.callContact ?? ''}
                onSave={(value) => saveField({ callContact: value.trim() })}
              />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Autres numéros (propriétaire, agent, famille... chacun aura ses propres boutons)
              </p>
              <div className="flex flex-col gap-1">
                {additionalContacts.map((number, index) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={index} className="flex items-center gap-1.5">
                    <EditableField value={number} onSave={(value) => saveAdditionalContactAt(index, value)} />
                    <button
                      type="button"
                      onClick={() => removeAdditionalContactAt(index)}
                      className="text-red-500 hover:text-red-700"
                      aria-label="Supprimer ce numéro"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              {additionalContacts.length < MAX_ADDITIONAL_CONTACTS && (
                <Button type="button" variant="outline" size="sm" className="mt-1" onClick={addAdditionalContact}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter un numéro
                </Button>
              )}
            </div>
          </div>
        </section>

        <ContactSection property={property} />

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

        <Button onClick={goToMyListings} size="lg" className="self-center gap-1.5">
          <CheckCircle2 className="h-4 w-4" /> Terminé — voir mes annonces
        </Button>
      </section>
    </div>
  )
}
