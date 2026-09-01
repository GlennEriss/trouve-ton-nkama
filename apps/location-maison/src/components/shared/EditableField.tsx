'use client'

import { useState, type ReactNode } from 'react'
import { Pencil, Check, X, Loader2 } from 'lucide-react'

type EditableFieldProps = {
  value: string
  onSave: (newValue: string) => Promise<void>
  type?: 'text' | 'number' | 'textarea'
  renderValue?: (value: string) => ReactNode
  className?: string
  inputClassName?: string
}

/**
 * Display + pencil icon that toggles to an inline input on click, used on
 * the AI-created draft preview (`PreviewPropertyDraft.tsx`) so each attribute
 * (price, title, description...) can be corrected in place without leaving
 * the page. Kept intentionally simple (text/number/textarea) — compound
 * fields (location, tags, isOwner, property type) get their own dedicated
 * editors instead of being forced through this one.
 */
export function EditableField({ value, onSave, type = 'text', renderValue, className, inputClassName }: EditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!editing) {
    return (
      <span className={`group inline-flex items-center gap-2 ${className ?? ''}`}>
        {renderValue ? renderValue(value) : value}
        <button
          type="button"
          onClick={() => {
            setDraft(value)
            setError(null)
            setEditing(true)
          }}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm hover:border-primary hover:bg-slate-50 hover:text-primary active:scale-95 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-primary"
          aria-label="Modifier"
          title="Modifier"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </span>
    )
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(draft)
      setEditing(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Échec de la mise à jour.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <span className="inline-flex flex-col gap-1.5 align-top">
      <span className="inline-flex items-start gap-1.5">
        {type === 'textarea' ? (
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            className={`min-w-[240px] rounded-md border border-slate-300 px-2 py-1 text-sm dark:bg-gray-900 ${inputClassName ?? ''}`}
            autoFocus
          />
        ) : (
          <input
            type={type}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className={`rounded-md border border-slate-300 px-2 py-1 text-sm dark:bg-gray-900 ${inputClassName ?? ''}`}
            autoFocus
          />
        )}
        {/* Boutons pleins (pas juste des icônes nues) : sur mobile, un icône seul sans fond ni
            bordure ne se lit pas comme un bouton et rate la cible tactile recommandée (~36px+).
            Vert plein = action qui valide/persiste, gris bordé = action neutre/annule — même
            langage que le reste de l'UI (Button primaire vs outline). */}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-white shadow-sm hover:bg-green-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Enregistrer"
          title="Enregistrer"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={saving}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 shadow-sm hover:border-red-400 hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-red-400"
          aria-label="Annuler"
          title="Annuler"
        >
          <X className="h-5 w-5" />
        </button>
      </span>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </span>
  )
}
