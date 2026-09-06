'use client'

import { HelpCircle } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@trouve-ton-nkama/ui/popover'
import { Label } from '@trouve-ton-nkama/ui/label'
import { cn } from '@/lib/utils'

/**
 * Bouton rond "?" à côté d'un libellé de champ, qui ouvre une explication au clic/tap (Popover,
 * pas Tooltip au survol — beaucoup d'utilisateurs remplissent ce formulaire au téléphone, où le
 * survol n'existe pas). À utiliser quand le libellé seul ne suffit pas à deviner ce qui est
 * attendu (ex. "Lien au clic" — beaucoup ne savent pas qu'un numéro d'appel `tel:...` est aussi
 * accepté, pas seulement un lien WhatsApp/site web).
 */
export function FieldHelp({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          // Volontairement générique, sans répéter le libellé du champ dans l'aria-label
          // (ex. PAS "Aide : Lien au clic") : ça matcherait aussi getByLabelText(/Lien au
          // clic/i) dans les tests — et plus largement toute recherche par le nom du champ —
          // en plus du vrai champ associé, pour deux éléments trouvés au lieu d'un. Le contexte
          // reste clair pour un lecteur d'écran : ce bouton suit immédiatement le libellé du
          // champ concerné.
          aria-label="Voir l'explication de ce champ"
          className={cn(
            'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-secondary dark:text-gray-500 dark:hover:bg-gray-800',
            className,
          )}
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-sm leading-5 text-gray-700 dark:text-gray-200">
        {children}
      </PopoverContent>
    </Popover>
  )
}

/** `<Label>` + `FieldHelp` déjà assemblés, pour ne pas répéter la mise en page à chaque champ. */
export function LabelWithHelp({
  htmlFor,
  label,
  required,
  help,
}: {
  htmlFor: string
  label: string
  required?: boolean
  help: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>
        {label} {required && <span className="text-red-600">*</span>}
      </Label>
      <FieldHelp>{help}</FieldHelp>
    </div>
  )
}
