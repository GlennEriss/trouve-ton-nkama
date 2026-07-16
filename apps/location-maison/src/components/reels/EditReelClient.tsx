'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Save, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { routes } from '@/constantes/routes'
import { getReelById, updateReelDetails } from '@/db/reel.db'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useToast } from '@/hooks/use-toast'

const MAX_DESCRIPTION_LENGTH = 280

interface EditReelClientProps {
  reelId: string
}

export default function EditReelClient({ reelId }: EditReelClientProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, isLoading: authLoading, isFirebaseConnected } = useCurrentUser()
  const { toast } = useToast()
  const [contact, setContact] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [initializedReelId, setInitializedReelId] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  const reelQuery = useQuery({
    queryKey: ['reels', 'edit', reelId, user?.uid],
    queryFn: () => getReelById(reelId),
    enabled: Boolean(user?.uid && isFirebaseConnected),
  })

  const reel = reelQuery.data
  const canEdit = Boolean(reel && user?.uid && reel.createdBy === user.uid)

  React.useEffect(() => {
    if (!reel || initializedReelId === reel.id) return
    setContact(reel.contact ?? '')
    setDescription(reel.description ?? '')
    setInitializedReelId(reel.id)
  }, [initializedReelId, reel])

  const normalizedContact = contact.trim()
  const normalizedDescription = description.trim()
  const initialContact = reel?.contact?.trim() ?? ''
  const initialDescription = reel?.description?.trim() ?? ''
  const hasChanges = normalizedContact !== initialContact || normalizedDescription !== initialDescription
  const waitingForFirebase = Boolean(user?.uid && !isFirebaseConnected)
  const isBusy = isSaving || reelQuery.isLoading || authLoading || waitingForFirebase

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canEdit || isSaving) return

    setIsSaving(true)
    try {
      await updateReelDetails(reelId, contact, description)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['reels', 'mine', user?.uid] }),
        queryClient.invalidateQueries({ queryKey: ['reels', 'edit', reelId, user?.uid] }),
        queryClient.invalidateQueries({ queryKey: ['reels-feed'] }),
      ])
      toast({
        title: "Réel modifié",
        description: "Le numéro et la description ont été mis à jour.",
      })
      router.push(routes.protected.reels_mine)
    } catch (error) {
      toast({
        title: "Modification impossible",
        description: error instanceof Error ? error.message : "Une erreur est survenue.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading || waitingForFirebase || reelQuery.isLoading) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm text-slate-500">
          {waitingForFirebase ? "Connexion sécurisée..." : "Chargement du réel..."}
        </p>
      </div>
    )
  }

  if (reelQuery.isError || !reel || !canEdit) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Link href={routes.protected.reels_mine}>
          <Button variant="ghost" size="sm" className="group -ml-2">
            <ArrowLeft className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Mes réels
          </Button>
        </Link>
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
            Réel introuvable ou non modifiable.
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Vous ne pouvez modifier que les réels que vous avez créés.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href={routes.protected.reels_mine}>
        <Button variant="ghost" size="sm" className="group -ml-2">
          <ArrowLeft className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Mes réels
        </Button>
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Modifier le réel</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Corrigez le numéro de contact ou la description sans renvoyer la vidéo.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 p-3 dark:border-slate-800">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
            {reel.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={reel.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Video className="h-6 w-6 text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              {reel.propertyId ? 'Réel attaché à une annonce' : 'Réel sans annonce attachée'}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Statut : {reel.moderationStatus === 'APPROVED' ? 'approuvé' : reel.moderationStatus === 'PENDING' ? 'en attente' : 'rejeté'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div>
            <Label htmlFor="reel-contact">Numéro à contacter (WhatsApp / appel)</Label>
            <Input
              id="reel-contact"
              type="tel"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              placeholder="Ex: +241 XX XX XX XX"
              disabled={isBusy}
              className="mt-1"
            />
            <p className="mt-1 text-xs text-slate-400">
              Laissez vide pour utiliser le contact de l&apos;annonce, ou votre numéro de profil.
            </p>
          </div>

          <div>
            <Label htmlFor="reel-description">Description (facultatif)</Label>
            <Textarea
              id="reel-description"
              value={description}
              onChange={(event) => setDescription(event.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
              placeholder="Ex: Visite rapide, quartier calme, proche commerces..."
              disabled={isBusy}
              maxLength={MAX_DESCRIPTION_LENGTH}
              rows={4}
              className="mt-1 resize-none"
            />
            <p className="mt-1 text-right text-xs text-slate-400">
              {description.length}/{MAX_DESCRIPTION_LENGTH}
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Link href={routes.protected.reels_mine}>
              <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={isSaving}>
                Annuler
              </Button>
            </Link>
            <Button type="submit" disabled={isBusy || !hasChanges} className="w-full sm:w-auto">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
