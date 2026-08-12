'use client'

import React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Loader2, Pencil, Send, Video, X, XCircle } from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useVideoDropzone, type VideoDropzoneRejectionReason } from '@/hooks/useVideoDropzone'
import { useReelDraftVideoStorage } from '@/hooks/useReelDraftVideoStorage'
import { buildRawReelVideoPath, createReel, markReelUploadFailed, uploadRawReelVideo, subscribeToReel } from '@/db/reel.db'
import { PublishAuthModal } from '@/components/property-publish/PublishAuthModal'
import { VideoTrimEditor } from '@/components/reels/VideoTrimEditor'
import { Button } from '@trouve-ton-nkama/ui/button'
import { useToast } from '@/hooks/use-toast'
import { routes } from '@/constantes/routes'
import { isAnnouncer } from '@/lib/auth/role-routing'
import type { Reel, ReelProcessingStatus } from '@/models/reel'

const REJECTION_MESSAGES: Record<VideoDropzoneRejectionReason, string> = {
  'invalid-type': "Format non supporté. Utilisez MP4, MOV ou WebM.",
  'too-large': "Fichier trop volumineux.",
  'too-long': "Vidéo trop longue (5 minutes maximum).",
  'duration-read-error': "Impossible de lire cette vidéo, réessayez avec un autre fichier.",
}

const PROCESSING_LABELS: Record<ReelProcessingStatus, string> = {
  uploading: "Envoi de la vidéo en cours...",
  processing: "Traitement de la vidéo en cours (compression, miniature)...",
  ready: "Vidéo traitée — en attente de validation par notre équipe. Vous pourrez l'attacher à une annonce depuis \"Mes réels\".",
  failed: "Le traitement de la vidéo a échoué.",
}

const MAX_DESCRIPTION_LENGTH = 280
const ALLOWED_RETURN_PATHS = new Set([
  routes.protected.publish,
  routes.protected.reels_mine,
  routes.protected.reels,
])

function getSafeReturnHref(returnTo: string | null) {
  if (!returnTo) return routes.protected.publish
  return ALLOWED_RETURN_PATHS.has(returnTo) ? returnTo : routes.protected.publish
}

export default function CreateOrphanReelClient() {
  const { user, isFirebaseConnected } = useCurrentUser()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const { saveDraftVideo, loadDraftVideo, clearDraftVideo } = useReelDraftVideoStorage()
  const returnHref = getSafeReturnHref(searchParams.get('returnTo'))

  const [videoFile, setVideoFile] = React.useState<File | null>(null)
  const [videoDurationSeconds, setVideoDurationSeconds] = React.useState(0)
  const [trimStart, setTrimStart] = React.useState(0)
  const [trimEnd, setTrimEnd] = React.useState(0)
  const [muted, setMuted] = React.useState(false)
  const [isEditingContact, setIsEditingContact] = React.useState(false)
  // Numéro à afficher sur le réel dans le feed (boutons WhatsApp/Appel) — pré-rempli avec le
  // numéro de profil de l'annonceur, modifiable, pas obligatoire (repli sur le numéro de profil
  // au moment de l'affichage si laissé vide, voir ReelsFeedClient).
  const [contact, setContact] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [pendingSubmission, setPendingSubmission] = React.useState(false)
  const [isPublishAuthModalOpen, setIsPublishAuthModalOpen] = React.useState(false)
  const isFinalSubmittingRef = React.useRef(false)
  const [isFinalSubmitting, setIsFinalSubmitting] = React.useState(false)
  const [reel, setReel] = React.useState<(Reel & { id: string }) | null>(null)

  // Restaure un brouillon vidéo après un retour de redirection externe (OAuth Google, qui
  // démonte entièrement la page) — mirror du chargement IndexedDB du formulaire annonce.
  React.useEffect(() => {
    loadDraftVideo().then((file) => {
      if (file) setVideoFile(file)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    if (user?.phoneNumbers?.[0]) setContact((current) => current || user.phoneNumbers[0])
  }, [user?.phoneNumbers])

  React.useEffect(() => {
    if (!reel?.id) return undefined
    return subscribeToReel(reel.id, (updated) => {
      if (updated) setReel(updated)
    })
  }, [reel?.id])

  const prepareForExternalRedirect = React.useCallback(() => {
    void saveDraftVideo(videoFile)
  }, [saveDraftVideo, videoFile])

  const handleRejected = React.useCallback(({ reason }: { reason: VideoDropzoneRejectionReason }) => {
    toast({
      title: "Vidéo refusée",
      description: REJECTION_MESSAGES[reason],
      variant: "destructive",
    })
  }, [toast])

  const handleFileSelected = React.useCallback((file: File, durationSeconds: number) => {
    setVideoFile(file)
    setVideoDurationSeconds(durationSeconds)
    setTrimStart(0)
    setTrimEnd(durationSeconds)
    setMuted(false)
  }, [])

  const handleDiscardVideo = React.useCallback(() => {
    setVideoFile(null)
    setVideoDurationSeconds(0)
    setTrimStart(0)
    setTrimEnd(0)
    setMuted(false)
    void clearDraftVideo()
  }, [clearDraftVideo])

  const runFinalSubmission = React.useCallback(async (file: File) => {
    if (!user?.uid) return

    try {
      const reelId = crypto.randomUUID()
      const trimmedContact = contact.trim() || undefined
      const trimmedDescription = description.trim() || undefined
      const rawVideoPath = buildRawReelVideoPath(file, user.uid, reelId)
      const isTrimmed = trimStart > 0 || trimEnd < videoDurationSeconds
      const createdId = await createReel(
        reelId,
        null,
        user.uid,
        rawVideoPath,
        trimmedContact,
        trimmedDescription,
        {
          ...(isTrimmed ? { trimStartSeconds: trimStart, trimEndSeconds: trimEnd } : {}),
          ...(muted ? { muted: true } : {}),
        }
      )

      if (!createdId) {
        throw new Error("La création du réel a échoué.")
      }

      try {
        await uploadRawReelVideo(file, user.uid, reelId)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Échec de l'envoi de la vidéo."
        await markReelUploadFailed(createdId, message)
        throw error
      }

      void clearDraftVideo()
      setReel({
        id: createdId,
        propertyId: null,
        createdBy: user.uid,
        processingStatus: 'uploading',
        rawVideoPath,
        moderationStatus: 'PENDING',
        viewCount: 0,
        likeCount: 0,
        shareCount: 0,
        giftCount: 0,
        giftTotalAmount: 0,
        ...(trimmedContact ? { contact: trimmedContact } : {}),
        ...(trimmedDescription ? { description: trimmedDescription } : {}),
      } as Reel & { id: string })

      toast({
        title: "Vidéo envoyée",
        description: "Le traitement démarre, ça peut prendre quelques minutes.",
      })
    } catch (error) {
      toast({
        title: "Échec de l'envoi",
        description: error instanceof Error ? error.message : "Une erreur est survenue.",
        variant: "destructive",
      })
      throw error
    }
  }, [user?.uid, contact, description, trimStart, trimEnd, videoDurationSeconds, muted, clearDraftVideo, toast])

  const handlePublish = React.useCallback(async () => {
    if (!videoFile) return
    if (isFinalSubmittingRef.current) return

    isFinalSubmittingRef.current = true
    setIsFinalSubmitting(true)

    if (!user || !isAnnouncer(user)) {
      // Visiteur non connecté (ou compte sans rôle Annonceur) : la vidéo reste en mémoire
      // (+ IndexedDB si redirection Google), on demande la création de compte/connexion.
      setPendingSubmission(true)
      setIsPublishAuthModalOpen(true)
      return
    }

    setPendingSubmission(true)
  }, [videoFile, user])

  // Dès que l'utilisateur a créé un compte/s'est connecté et obtenu le rôle Annonceur, et que
  // le SDK Firebase Client est synchronisé, on republie automatiquement la vidéo déjà choisie
  // sans redemander de la sélectionner — mirror de property.form.provider.tsx.
  React.useEffect(() => {
    if (!pendingSubmission) return
    if (!user || !isAnnouncer(user)) return
    if (!isFirebaseConnected) return
    if (!videoFile) return

    setPendingSubmission(false)
    setIsPublishAuthModalOpen(false)
    runFinalSubmission(videoFile)
      .catch(() => {
        // runFinalSubmission a déjà notifié l'erreur via toast.
      })
      .finally(() => {
        isFinalSubmittingRef.current = false
        setIsFinalSubmitting(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSubmission, user, isFirebaseConnected, videoFile])

  const { getRootProps, getInputProps, isDragActive, isProcessing } = useVideoDropzone({
    onFile: handleFileSelected,
    onRejected: handleRejected,
  })

  const busy = isFinalSubmitting || isProcessing
  const showDropzone = !reel || reel.processingStatus === 'failed'

  if (showDropzone && videoFile) {
    // z-40, sous le Dialog partagé (z-50, voir ui/dialog.tsx) : PublishAuthModal doit pouvoir
    // s'afficher par-dessus cet éditeur plein écran pour les visiteurs non connectés/non-annonceurs.
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-black">
        <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-2">
          <button
            type="button"
            onClick={handleDiscardVideo}
            disabled={busy}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-40"
            aria-label="Annuler"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

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

        <div className="space-y-2 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-2">
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
              disabled={busy}
              className="h-11 w-full rounded-full border-0 bg-white/10 px-4 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/40"
            />
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
              placeholder="Ajouter une légende..."
              disabled={busy}
              className="flex-1 rounded-full border-0 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/40"
            />
            <button
              type="button"
              onClick={handlePublish}
              disabled={busy}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary text-white shadow-lg disabled:opacity-50"
              aria-label="Publier le réel"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <PublishAuthModal
          isOpen={isPublishAuthModalOpen}
          onClose={() => {
            setIsPublishAuthModalOpen(false)
            setPendingSubmission(false)
            isFinalSubmittingRef.current = false
            setIsFinalSubmitting(false)
          }}
          prepareForExternalRedirect={prepareForExternalRedirect}
          description="Votre réel est prêt. Créez un compte annonceur (ou connectez-vous) pour le publier — la vidéo que vous avez choisie est conservée."
          becomeAnnouncerSource="reel_add_modal"
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm dark:border-emerald-900 dark:from-emerald-950/30 dark:to-gray-900 md:p-6">
        <Button variant="ghost" className="group -ml-2 h-11 rounded-full px-4" asChild>
          <Link href={returnHref}>
            <ArrowLeft className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Retour
          </Link>
        </Button>

        <div className="mt-3">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary dark:text-primary-200">
            <Video className="h-3.5 w-3.5" />
            Espace annonceur
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">Créer un réel</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Vidéo verticale, 5 minutes maximum. Vous pourrez l&apos;attacher à une de vos annonces ensuite.
          </p>
        </div>
      </section>

      {showDropzone && (
        <div
          {...getRootProps()}
          className={`flex min-h-[260px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-white p-6 text-center shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:bg-gray-900 ${
            isDragActive ? 'border-primary bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-300 hover:border-primary/60 dark:border-slate-700'
          } ${busy ? 'pointer-events-none opacity-60' : ''}`}
        >
          <input {...getInputProps({ 'aria-label': 'Choisir une vidéo' })} disabled={busy} />
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-secondary/15 dark:text-primary-200">
            {isProcessing ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              <Video className="h-7 w-7" />
            )}
          </div>
          <p className="font-medium text-slate-700 dark:text-slate-200">
            {isProcessing ? "Vérification en cours..." : "Glissez une vidéo ou cliquez pour en choisir une"}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300">MP4, MOV ou WebM — 5 minutes maximum</p>
        </div>
      )}

      {reel && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-start gap-3">
          {reel.processingStatus === 'ready' && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />}
          {reel.processingStatus === 'failed' && <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />}
          {(reel.processingStatus === 'uploading' || reel.processingStatus === 'processing') && (
            <Loader2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5 animate-spin" />
          )}
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {PROCESSING_LABELS[reel.processingStatus]}
            </p>
            {reel.processingStatus === 'failed' && reel.processingError && (
              <p className="text-sm text-red-600 mt-1">{reel.processingError}</p>
            )}
            {reel.processingStatus === 'ready' && (
              <Link href={routes.protected.reels_mine} className="inline-block mt-2">
                <Button size="sm" variant="outline">Voir mes réels</Button>
              </Link>
            )}
          </div>
        </div>
      )}

      <PublishAuthModal
        isOpen={isPublishAuthModalOpen}
        onClose={() => {
          setIsPublishAuthModalOpen(false)
          setPendingSubmission(false)
          isFinalSubmittingRef.current = false
          setIsFinalSubmitting(false)
        }}
        prepareForExternalRedirect={prepareForExternalRedirect}
        description="Votre réel est prêt. Créez un compte annonceur (ou connectez-vous) pour le publier — la vidéo que vous avez choisie est conservée."
        becomeAnnouncerSource="reel_add_modal"
      />
    </div>
  )
}
