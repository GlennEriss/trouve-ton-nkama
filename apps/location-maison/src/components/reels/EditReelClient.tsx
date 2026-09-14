'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Pencil, Send, Video, X } from 'lucide-react'
import { Button } from '@trouve-ton-nkama/ui/button'
import { routes } from '@/constantes/routes'
import {
  buildRawReelVideoPath,
  getReelById,
  markReelUploadFailed,
  retrimReel,
  updateReelDetails,
  uploadRawReelVideo,
} from '@/db/reel.db'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useToast } from '@/hooks/use-toast'
import { readVideoDurationSeconds } from '@/hooks/useVideoDropzone'
import { VideoTrimEditor } from '@/components/reels/VideoTrimEditor'
import { createLogger } from '@/lib/logger'
import { createSubmissionPerformanceTracker } from '@/lib/observability/submission-performance'

const logger = createLogger('components.edit-reel-client')

const MAX_DESCRIPTION_LENGTH = 280

type VideoFetchStatus = 'idle' | 'loading' | 'ready' | 'error'

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
  // Progression de l'upload vidéo lors d'un retrim (0-100), null hors upload — voir
  // docs/performance-creation-modification-annonces-reels.md, point 6.
  const [uploadPercent, setUploadPercent] = React.useState<number | null>(null)

  // Barre de montage identique à la création (VideoTrimEditor) : la vidéo déjà publiée est
  // récupérée en Blob (elle est déjà transcodée/allégée) pour permettre un nouveau montage sans
  // bloquer l'affichage — le lecteur simple reste visible pendant ce chargement en arrière-plan.
  const [videoFetchStatus, setVideoFetchStatus] = React.useState<VideoFetchStatus>('idle')
  const [videoFile, setVideoFile] = React.useState<File | null>(null)
  const [videoDurationSeconds, setVideoDurationSeconds] = React.useState(0)
  const [trimStart, setTrimStart] = React.useState(0)
  const [trimEnd, setTrimEnd] = React.useState(0)
  const [muted, setMuted] = React.useState(false)

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

  // La vidéo déjà "ready" devient le point de départ d'un éventuel nouveau montage : on la
  // traite comme un fichier fraîchement choisi (trim 0..durée totale), pas comme le montage
  // d'origine — le brut d'origine n'existe de toute façon plus (supprimé après transcodage).
  // Passe par /api/reels/{id}/video (Admin SDK côté serveur) plutôt qu'un fetch direct de
  // reel.videoUrl : ce fetch échouait systématiquement en CORS (le bucket Storage n'a aucune
  // configuration CORS — <video src=...> fonctionne quand même car la lecture ne passe jamais
  // par fetch/XHR), ce qui faisait silencieusement retomber sur le lecteur simple sans jamais
  // afficher la barre de montage — bug rapporté directement par l'utilisateur en capture d'écran.
  React.useEffect(() => {
    if (!reel?.videoUrl || reel.processingStatus !== 'ready') return
    let cancelled = false
    setVideoFetchStatus('loading')

    fetch(`/api/reels/${encodeURIComponent(reel.id)}/video`)
      .then((res) => {
        if (!res.ok) throw new Error('download failed')
        return res.blob()
      })
      .then(async (blob) => {
        if (cancelled) return
        const file = new File([blob], `${reel.id}.mp4`, { type: blob.type || 'video/mp4' })
        const duration = await readVideoDurationSeconds(file)
        if (cancelled) return
        setVideoFile(file)
        setVideoDurationSeconds(duration)
        setTrimStart(0)
        setTrimEnd(duration)
        setMuted(false)
        setVideoFetchStatus('ready')
      })
      .catch(() => {
        // Best-effort : la vidéo simple reste lisible/éditable (contact/description) même si
        // le montage n'a pas pu se charger (réseau, CORS...).
        if (!cancelled) setVideoFetchStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [reel?.id, reel?.videoUrl, reel?.processingStatus])

  const normalizedContact = contact.trim()
  const normalizedDescription = description.trim()
  const initialContact = reel?.contact?.trim() ?? ''
  const initialDescription = reel?.description?.trim() ?? ''
  const isTrimChanged = videoFetchStatus === 'ready' && (trimStart > 0 || trimEnd < videoDurationSeconds || muted)
  const hasChanges =
    normalizedContact !== initialContact || normalizedDescription !== initialDescription || isTrimChanged
  const waitingForFirebase = Boolean(user?.uid && !isFirebaseConnected)
  const isBusy = isSaving || reelQuery.isLoading || authLoading || waitingForFirebase

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canEdit || isSaving || !hasChanges || !user?.uid) return

    setIsSaving(true)
    // Instrumentation par phase (voir docs/performance-creation-modification-annonces-reels.md,
    // point 8) — un nouvel identifiant par tentative, jamais de contenu utilisateur dans les
    // dimensions, jamais d'impact sur le résultat de la soumission (best-effort).
    const perf = createSubmissionPerformanceTracker({ dimensions: { journeyType: 'reel', mode: 'update' } })
    try {
      if (isTrimChanged && videoFile) {
        const rawVideoPath = buildRawReelVideoPath(videoFile, user.uid, reelId)
        await perf.measure('reel_create', () =>
          retrimReel(reelId, rawVideoPath, trimStart, trimEnd, muted, contact, description),
        )
        try {
          setUploadPercent(0)
          await perf.measure('video_upload', () =>
            uploadRawReelVideo(videoFile, user.uid, reelId, {
              onProgress: (progress) => setUploadPercent(progress.percent),
            }),
          )
        } catch (uploadError) {
          const message = uploadError instanceof Error ? uploadError.message : "Échec de l'envoi de la vidéo."
          await markReelUploadFailed(reelId, message)
          throw uploadError
        } finally {
          setUploadPercent(null)
        }
      } else {
        await perf.measure('reel_create', () => updateReelDetails(reelId, contact, description))
      }

      // Le cache est mis à jour tout de suite (après la réussite serveur, jamais avant —
      // voir docs/performance-creation-modification-annonces-reels.md, point 7) plutôt que
      // d'attendre le refetch complet des trois invalidations. Un retrim doit refléter
      // immédiatement `processingStatus: "uploading"` ET retirer l'ancienne URL prête, sinon
      // l'interface pourrait continuer à montrer la vidéo périmée le temps du refetch.
      const reelQueryKey = ['reels', 'edit', reelId, user?.uid]
      queryClient.setQueryData(reelQueryKey, (previous: unknown) => {
        if (!previous || typeof previous !== 'object') return previous
        return isTrimChanged
          ? { ...previous, processingStatus: 'uploading', videoUrl: undefined }
          : { ...previous, contact, description }
      })

      // Invalidations lancées en arrière-plan, jamais sur le chemin critique de la
      // redirection : la mutation a déjà réussi, un échec d'invalidation ne doit ni bloquer
      // ni faire échouer la modification déjà enregistrée.
      void perf
        .measure('cache_invalidation', () =>
          Promise.all([
            queryClient.invalidateQueries({ queryKey: ['reels-mine', user?.uid] }),
            queryClient.invalidateQueries({ queryKey: reelQueryKey }),
            queryClient.invalidateQueries({ queryKey: ['reels-feed'] }),
          ]),
        )
        .catch((invalidationError) => {
          logger.warn('Reel cache invalidation failed after a successful edit', {
            error: invalidationError,
            reelId,
          })
        })

      toast({
        title: "Réel modifié",
        description: isTrimChanged
          ? "Le nouveau montage a été envoyé, le traitement démarre."
          : "Le numéro et la description ont été mis à jour.",
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
  // La barre de montage (VideoTrimEditor) remplace le lecteur simple dès que la vidéo déjà
  // publiée a fini d'être récupérée en arrière-plan (voir l'effet ci-dessus) — jusque-là, ou si
  // la récupération échoue, le lecteur simple reste affiché et seuls contact/description
  // restent modifiables.
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-2">
        <button
          type="button"
          onClick={() => router.push(routes.protected.reels_mine)}
          disabled={isSaving}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-40"
          aria-label="Retour à mes réels"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {videoFetchStatus === 'ready' && videoFile ? (
        <div className="relative mx-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white/5">
          <VideoTrimEditor
            file={videoFile}
            durationSeconds={videoDurationSeconds}
            trimStart={trimStart}
            trimEnd={trimEnd}
            onTrimChange={(start, end) => {
              setTrimStart(start)
              setTrimEnd(end)
            }}
            muted={muted}
            onToggleMute={() => setMuted((current) => !current)}
          />
        </div>
      ) : (
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
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-2 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-2"
      >
        <button
          type="button"
          onClick={() => setIsEditingContact((current) => !current)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs text-white/80"
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
            className="h-11 w-full rounded-full border-0 bg-white/10 px-4 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/40"
          />
        )}

        {uploadPercent !== null && (
          <div className="flex items-center gap-2 px-1">
            <div
              role="progressbar"
              aria-valuenow={uploadPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Envoi de la vidéo"
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15"
            >
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${uploadPercent}%` }} />
            </div>
            <span className="text-xs tabular-nums text-white/70">{uploadPercent}%</span>
          </div>
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
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary text-white shadow-lg disabled:opacity-50"
            aria-label="Enregistrer les modifications"
          >
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </form>
    </div>
  )
}
