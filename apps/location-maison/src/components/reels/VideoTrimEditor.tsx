'use client'

import React from 'react'
import { Volume2, VolumeX } from 'lucide-react'

const FILMSTRIP_FRAME_COUNT = 10
const MIN_TRIM_SECONDS = 1

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(total / 60)
  const secs = total % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function formatSize(bytes: number): string {
  const mo = bytes / (1024 * 1024)
  return `${mo.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`
}

/**
 * Capture N vignettes régulièrement espacées du fichier vidéo local (canvas, aucun décodage
 * serveur) pour construire la bande de montage façon statut WhatsApp. Best-effort : en cas
 * d'échec (codec non lisible par le navigateur, etc.), la barre de montage reste utilisable
 * sans vignettes plutôt que de bloquer l'édition.
 */
function generateFilmstrip(file: File, durationSeconds: number): Promise<string[]> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    const objectUrl = URL.createObjectURL(file)
    const canvas = document.createElement('canvas')
    const frames: string[] = []
    let index = 0
    let settled = false

    const finish = (result: string[]) => {
      if (settled) return
      settled = true
      URL.revokeObjectURL(objectUrl)
      resolve(result)
    }

    const captureNext = () => {
      if (index >= FILMSTRIP_FRAME_COUNT) {
        finish(frames)
        return
      }
      const t = (durationSeconds * index) / FILMSTRIP_FRAME_COUNT
      video.currentTime = Math.min(t, Math.max(0, durationSeconds - 0.05))
    }

    video.onloadeddata = () => {
      canvas.width = video.videoWidth || 180
      canvas.height = video.videoHeight || 320
      captureNext()
    }

    video.onseeked = () => {
      try {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          frames.push(canvas.toDataURL('image/jpeg', 0.5))
        }
      } catch {
        // ignore une vignette manquée, on continue les suivantes
      }
      index += 1
      captureNext()
    }

    video.onerror = () => finish(frames)
    video.src = objectUrl
  })
}

interface TrimBarProps {
  durationSeconds: number
  trimStart: number
  trimEnd: number
  onChange: (start: number, end: number) => void
  frames: string[]
  disabled?: boolean
}

function TrimBar({ durationSeconds, trimStart, trimEnd, onChange, frames, disabled }: Readonly<TrimBarProps>) {
  const trackRef = React.useRef<HTMLDivElement | null>(null)
  const draggingRef = React.useRef<'start' | 'end' | null>(null)

  const clamp = React.useCallback(
    (value: number) => Math.max(0, Math.min(durationSeconds, value)),
    [durationSeconds]
  )

  const timeFromClientX = React.useCallback(
    (clientX: number): number => {
      const el = trackRef.current
      if (!el || durationSeconds <= 0) return 0
      const rect = el.getBoundingClientRect()
      const ratio = (clientX - rect.left) / rect.width
      return clamp(ratio * durationSeconds)
    },
    [clamp, durationSeconds]
  )

  const handlePointerDown = (handle: 'start' | 'end') => (event: React.PointerEvent) => {
    if (disabled) return
    event.preventDefault()
    draggingRef.current = handle
    ;(event.target as Element).setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!draggingRef.current) return
    const t = timeFromClientX(event.clientX)
    if (draggingRef.current === 'start') {
      onChange(Math.min(t, trimEnd - MIN_TRIM_SECONDS), trimEnd)
    } else {
      onChange(trimStart, Math.max(t, trimStart + MIN_TRIM_SECONDS))
    }
  }

  const handlePointerUp = () => {
    draggingRef.current = null
  }

  const startPct = durationSeconds > 0 ? (trimStart / durationSeconds) * 100 : 0
  const endPct = durationSeconds > 0 ? (trimEnd / durationSeconds) * 100 : 100

  return (
    <div
      ref={trackRef}
      data-testid="reel-trim-bar"
      className="relative h-16 w-full touch-none select-none overflow-hidden rounded-lg bg-neutral-800"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="absolute inset-0 flex">
        {frames.length > 0 ? (
          frames.map((src, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={index} src={src} alt="" draggable={false} className="h-full flex-1 object-cover" />
          ))
        ) : (
          <div className="h-full w-full bg-neutral-700" />
        )}
      </div>

      <div className="absolute inset-y-0 left-0 bg-black/60" style={{ width: `${startPct}%` }} />
      <div className="absolute inset-y-0 right-0 bg-black/60" style={{ width: `${100 - endPct}%` }} />

      <div
        className="pointer-events-none absolute inset-y-0 rounded-md border-2 border-white"
        style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
      />

      <div
        data-testid="reel-trim-handle-start"
        className="absolute inset-y-0 flex w-6 -translate-x-1/2 cursor-ew-resize touch-none items-center justify-center"
        style={{ left: `${startPct}%` }}
        onPointerDown={handlePointerDown('start')}
      >
        <div className="h-10 w-1.5 rounded-full bg-white shadow" />
      </div>
      <div
        data-testid="reel-trim-handle-end"
        className="absolute inset-y-0 flex w-6 -translate-x-1/2 cursor-ew-resize touch-none items-center justify-center"
        style={{ left: `${endPct}%` }}
        onPointerDown={handlePointerDown('end')}
      >
        <div className="h-10 w-1.5 rounded-full bg-white shadow" />
      </div>
    </div>
  )
}

export interface VideoTrimEditorProps {
  file: File
  durationSeconds: number
  trimStart: number
  trimEnd: number
  onTrimChange: (start: number, end: number) => void
  muted: boolean
  onToggleMute: () => void
}

export function VideoTrimEditor({
  file,
  durationSeconds,
  trimStart,
  trimEnd,
  onTrimChange,
  muted,
  onToggleMute,
}: Readonly<VideoTrimEditorProps>) {
  const [frames, setFrames] = React.useState<string[]>([])
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  // Créée DANS l'effet (pas via useMemo) : en React 18 StrictMode (dev), les effets sont
  // montés/démontés/remontés deux fois — un useMemo garde la même URL sur les deux montages
  // alors que le cleanup du premier la révoque, cassant le second montage (vidéo illisible,
  // MEDIA_ELEMENT_ERROR). Ici chaque montage recrée sa propre URL, y compris en double-invoke.
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  React.useEffect(() => {
    let cancelled = false
    setFrames([])
    generateFilmstrip(file, durationSeconds).then((result) => {
      if (!cancelled) setFrames(result)
    })
    return () => {
      cancelled = true
    }
  }, [file, durationSeconds])

  // Boucle la lecture sur la portion sélectionnée, comme l'aperçu WhatsApp.
  React.useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined

    if (video.currentTime < trimStart || video.currentTime >= trimEnd) {
      video.currentTime = trimStart
    }

    const handleTimeUpdate = () => {
      if (video.currentTime >= trimEnd) {
        video.currentTime = trimStart
        void video.play().catch(() => undefined)
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    return () => video.removeEventListener('timeupdate', handleTimeUpdate)
  }, [trimStart, trimEnd])

  const trimmedDurationSeconds = Math.max(0, trimEnd - trimStart)

  // Disposition WhatsApp : bande de montage EN HAUT (sous la rangée de boutons), pastille
  // son + durée/poids juste dessous, vidéo plein cadre au centre.
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 px-4 pb-1 pt-2">
        <TrimBar
          durationSeconds={durationSeconds}
          trimStart={trimStart}
          trimEnd={trimEnd}
          onChange={onTrimChange}
          frames={frames}
        />
        <div className="flex items-center gap-2 text-xs font-medium text-white/90">
          <button
            type="button"
            onClick={onToggleMute}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white"
            aria-label={muted ? 'Réactiver le son' : 'Couper le son'}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <span className="rounded-full bg-white/15 px-2.5 py-1.5 backdrop-blur-sm">
            {formatDuration(trimmedDurationSeconds)} · {formatSize(file.size)}
          </span>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
        {objectUrl && (
          <video
            ref={videoRef}
            src={objectUrl}
            className="max-h-full max-w-full object-contain"
            autoPlay
            loop
            muted={muted}
            playsInline
          />
        )}
      </div>
    </div>
  )
}
