'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Pencil, Send, Video, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  const [isEditingContact, setIsEditingContact] = React.useState(false)
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
    if (!canEdit || isSaving || !hasChanges) return

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
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
        <p className="text-sm text-white/70">
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
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Réel introuvable ou non modifiable.
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Vous ne pouvez modifier que les réels que vous avez créés.
          </p>
        </div>
      </div>
    )
  }

  // Même éditeur plein écran façon statut WhatsApp que le formulaire d'ajout
  // (CreateOrphanReelClient) : vidéo au centre, pilule contact + légende + envoi en bas.
  // Seule différence : la vidéo est déjà traitée (lecture depuis videoUrl, pas de montage).
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-2">
        <button
          type="button"
          onClick={() => router.push(routes.protected.reels_mine)}
          disabled={isSaving}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-40"
          aria-label="Retour à mes réels"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative mx-4 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl bg-white/5">
        {reel.videoUrl ? (
          <video
            src={reel.videoUrl}
            poster={reel.thumbnailUrl}
            controls
            playsInline
            loop
            className="h-full w-full object-contain"
          />
        ) : reel.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={reel.thumbnailUrl} alt="" className="h-full w-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-white/60">
            <Video className="h-10 w-10" />
            <p className="text-sm">Vidéo en cours de traitement</p>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-2 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-2"
      >
        <button
          type="button"
          onClick={() => setIsEditingContact((current) => !current)}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80"
        >
          <Pencil className="h-3 w-3" />
          {contact ? `Contact : ${contact}` : 'Ajouter un numéro de contact'}
        </button>

        {isEditingContact && (
          <input
            type="tel"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder="Ex: +241 XX XX XX XX"
            disabled={isBusy}
            className="w-full rounded-full border-0 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/40"
          />
        )}

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
            placeholder="Ajouter une légende..."
            disabled={isBusy}
            className="flex-1 rounded-full border-0 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/40"
          />
          <button
            type="submit"
            disabled={isBusy || !hasChanges}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#146B67] to-[#1FA89B] text-white shadow-lg disabled:opacity-50"
            aria-label="Enregistrer les modifications"
          >
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </form>
    </div>
  )
}
