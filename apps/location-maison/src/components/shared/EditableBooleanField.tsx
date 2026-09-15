'use client'

import { useState } from 'react'
import { Pencil, Check, X, Loader2 } from 'lucide-react'

type EditableBooleanFieldProps = {
  value: boolean
  onSave: (newValue: boolean) => Promise<void>
  trueLabel?: string
  falseLabel?: string
  className?: string
}

/**
 * Variante booléenne d'EditableField (deux boutons Oui/Non au lieu d'un input texte/nombre) —
 * pour les champs comme `Building.hasParking` qu'un input texte rendrait maladroit ("true"/
 * "false" tapé à la main). Même langage visuel (crayon -> édition -> vert valide/gris annule).
 */
export function EditableBooleanField({
  value,
  onSave,
  trueLabel = 'Oui',
  falseLabel = 'Non',
  className,
}: EditableBooleanFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!editing) {
    return (
      <span className={`group inline-flex items-center gap-2 ${className ?? ''}`}>
        {value ? trueLabel : falseLabel}
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
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex overflow-hidden rounded-md border border-slate-300 text-sm dark:border-slate-600">
          <button
            type="button"
            onClick={() => setDraft(true)}
            className={`px-2 py-1 ${draft ? 'bg-primary text-white' : 'bg-white text-slate-600 dark:bg-gray-900 dark:text-slate-300'}`}
          >
            {trueLabel}
          </button>
          <button
            type="button"
            onClick={() => setDraft(false)}
            className={`px-2 py-1 ${!draft ? 'bg-primary text-white' : 'bg-white text-slate-600 dark:bg-gray-900 dark:text-slate-300'}`}
          >
            {falseLabel}
          </button>
        </span>
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
