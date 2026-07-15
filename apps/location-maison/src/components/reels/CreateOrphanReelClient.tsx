'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Video, CheckCircle2, XCircle } from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useVideoDropzone, type VideoDropzoneRejectionReason } from '@/hooks/useVideoDropzone'
import { useReelDraftVideoStorage } from '@/hooks/useReelDraftVideoStorage'
import { buildRawReelVideoPath, createReel, markReelUploadFailed, uploadRawReelVideo, subscribeToReel } from '@/db/reel.db'
import { PublishAuthModal } from '@/components/property-publish/PublishAuthModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { routes } from '@/constantes/routes'
import { cn } from '@/lib/utils'
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

export default function CreateOrphanReelClient() {
  const { user, isFirebaseConnected } = useCurrentUser()
  const { toast } = useToast()
  const { saveDraftVideo, loadDraftVideo, clearDraftVideo } = useReelDraftVideoStorage()

  const [videoFile, setVideoFile] = React.useState<File | null>(null)
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

  const runFinalSubmission = React.useCallback(async (file: File) => {
    if (!user?.uid) return

    try {
      const reelId = crypto.randomUUID()
      const trimmedContact = contact.trim() || undefined
      const trimmedDescription = description.trim() || undefined
      const rawVideoPath = buildRawReelVideoPath(file, user.uid, reelId)
      const createdId = await createReel(reelId, null, user.uid, rawVideoPath, trimmedContact, trimmedDescription)

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
  }, [user?.uid, contact, description, clearDraftVideo, toast])

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
    onFile: (file) => setVideoFile(file),
    onRejected: handleRejected,
  })

  const busy = isFinalSubmitting || isProcessing
  const showDropzone = !reel || reel.processingStatus === 'failed'

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Link href={routes.protected.publish}>
        <Button variant="ghost" size="sm" className="group -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" />
          Retour
        </Button>
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Créer un réel</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Vidéo verticale, 5 minutes maximum. Vous pourrez l&apos;attacher à une de vos annonces ensuite.
        </p>
      </div>

      {showDropzone && !videoFile && (
        <div
          {...getRootProps()}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors",
            isDragActive ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-slate-300 dark:border-slate-700",
            busy && "pointer-events-none opacity-60"
          )}
        >
          <input {...getInputProps()} disabled={busy} />
          {isProcessing ? (
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
          ) : (
            <Video className="h-10 w-10 text-slate-400" />
          )}
          <p className="font-medium text-slate-700 dark:text-slate-200">
            {isProcessing ? "Vérification en cours..." : "Glissez une vidéo ou cliquez pour en choisir une"}
          </p>
          <p className="text-xs text-slate-400">MP4, MOV ou WebM — 5 minutes maximum</p>
        </div>
      )}

      {showDropzone && videoFile && (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
            <Video className="h-6 w-6 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{videoFile.name}</p>
              <p className="text-xs text-slate-400">{Math.round(videoFile.size / (1024 * 1024))} Mo</p>
            </div>
          </div>
          <div>
            <Label htmlFor="reel-contact">Numéro à contacter (WhatsApp / appel)</Label>
            <Input
              id="reel-contact"
              type="tel"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              placeholder="Ex: +241 XX XX XX XX"
              disabled={busy}
              className="mt-1"
            />
            <p className="text-xs text-slate-400 mt-1">
              Laissez vide pour utiliser votre numéro de profil par défaut.
            </p>
          </div>
          <div>
            <Label htmlFor="reel-description">Description (facultatif)</Label>
            <Textarea
              id="reel-description"
              value={description}
              onChange={(event) => setDescription(event.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
              placeholder="Ex: Visite rapide, quartier calme, proche commerces..."
              disabled={busy}
              maxLength={MAX_DESCRIPTION_LENGTH}
              rows={3}
              className="mt-1 resize-none"
            />
            <p className="mt-1 text-right text-xs text-slate-400">
              {description.length}/{MAX_DESCRIPTION_LENGTH}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setVideoFile(null)} disabled={busy}>
              Changer de vidéo
            </Button>
            <Button className="flex-1" onClick={handlePublish} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Publier le réel
            </Button>
          </div>
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
