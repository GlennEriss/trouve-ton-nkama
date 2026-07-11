'use client'

import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Loader2, Video, CheckCircle2, XCircle } from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useProperty } from '@/hooks/use-property'
import { useVideoDropzone, type VideoDropzoneRejectionReason } from '@/hooks/useVideoDropzone'
import { createReel, uploadRawReelVideo, subscribeToReel } from '@/db/reel.db'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { routes } from '@/constantes/routes'
import { cn } from '@/lib/utils'
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
  ready: "Vidéo traitée — en attente de validation par notre équipe.",
  failed: "Le traitement de la vidéo a échoué.",
}

interface CreateReelClientProps {
  propertyId: string
}

export default function CreateReelClient({ propertyId }: CreateReelClientProps) {
  const { user, isLoading: authLoading } = useCurrentUser()
  const { data: property, isLoading: propertyLoading } = useProperty(propertyId)
  const { toast } = useToast()

  const [isUploading, setIsUploading] = React.useState(false)
  const [reel, setReel] = React.useState<(Reel & { id: string }) | null>(null)

  React.useEffect(() => {
    if (!authLoading && !propertyLoading && property) {
      if (property.createdBy !== user?.uid) {
        redirect(`/property/${propertyId}`)
      }
    }
  }, [property, user?.uid, propertyId, authLoading, propertyLoading])

  React.useEffect(() => {
    if (!reel?.id) return undefined
    return subscribeToReel(reel.id, (updated) => {
      if (updated) setReel(updated)
    })
  }, [reel?.id])

  const handleRejected = React.useCallback(({ reason }: { reason: VideoDropzoneRejectionReason }) => {
    toast({
      title: "Vidéo refusée",
      description: REJECTION_MESSAGES[reason],
      variant: "destructive",
    })
  }, [toast])

  const handleFile = React.useCallback(async (file: File) => {
    if (!user?.uid) return

    setIsUploading(true)
    try {
      const reelId = crypto.randomUUID()
      const rawVideoPath = await uploadRawReelVideo(file, user.uid, reelId)
      const createdId = await createReel(reelId, propertyId, user.uid, rawVideoPath)

      if (!createdId) {
        throw new Error("La création du réel a échoué.")
      }

      setReel({
        id: createdId,
        propertyId,
        createdBy: user.uid,
        processingStatus: 'uploading',
        rawVideoPath,
        moderationStatus: 'PENDING',
        viewCount: 0,
        giftCount: 0,
        giftTotalAmount: 0,
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
    } finally {
      setIsUploading(false)
    }
  }, [user?.uid, propertyId, toast])

  const { getRootProps, getInputProps, isDragActive, isProcessing } = useVideoDropzone({
    onFile: handleFile,
    onRejected: handleRejected,
  })

  if (authLoading || propertyLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-slate-500 dark:text-slate-400">Chargement...</p>
      </div>
    )
  }

  if (!property || property.createdBy !== user?.uid) {
    return null
  }

  const busy = isUploading || isProcessing
  const showDropzone = !reel || reel.processingStatus === 'failed'

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Link href={routes.protected.properties}>
        <Button variant="ghost" size="sm" className="group -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" />
          Retour à mes annonces
        </Button>
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Ajouter un réel</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Pour l&apos;annonce « {property.title} » — vidéo verticale, 5 minutes maximum.
        </p>
      </div>

      {showDropzone && (
        <div
          {...getRootProps()}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors",
            isDragActive ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-slate-300 dark:border-slate-700",
            busy && "pointer-events-none opacity-60"
          )}
        >
          <input {...getInputProps()} disabled={busy} />
          {busy ? (
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
          ) : (
            <Video className="h-10 w-10 text-slate-400" />
          )}
          <p className="font-medium text-slate-700 dark:text-slate-200">
            {busy ? "Envoi en cours..." : "Glissez une vidéo ou cliquez pour en choisir une"}
          </p>
          <p className="text-xs text-slate-400">MP4, MOV ou WebM — 5 minutes maximum</p>
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
          </div>
        </div>
      )}
    </div>
  )
}
