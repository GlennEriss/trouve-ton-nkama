"use client";

import type { Dispatch, SetStateAction } from "react";

import { Input } from "@/components/ui/input";
import {
  LOGEMENT_BASE_FIELDS,
  LOGEMENT_LIKE_TYPES,
  PROPERTY_TYPE_EXTRA_FIELDS,
  type ListingTypeValue,
  type PropertyFieldRule,
} from "@/modules/listing-management/domain/property-type-fields";

/**
 * Rendu générique des champs "étape 2" pilotés par PROPERTY_TYPE_FIELD_RULES — remplace les
 * ~9 blocs JSX conditionnels par type (dupliqués à l'identique dans dashboard/listings/new et
 * dashboard/announcers) par une seule fonction, partagée par les deux pages.
 *
 * Générique sur `T` (le state `CreateListingFormState` propre à chaque page — champs en
 * `string`, accès dynamique par clé) pour accepter directement le setter `useState` de chaque
 * page sans conversion.
 *
 * `variant` préserve la convention visuelle propre à chaque page (elles diffèrent, pas de
 * raison de les uniformiser dans ce refactor) :
 * - "placeholder" (dashboard/listings/new) : `<Input placeholder="..."/>` seul, pas de label visible.
 * - "labeled" (dashboard/announcers) : `<p>Label</p>` visible au-dessus de chaque champ, en plus
 *   du placeholder (texte légèrement simplifié par rapport à l'original, ex. placeholder
 *   "Nombre de garages (nbrGarages)" au lieu de "Garages (nbrGarages)" — différence mineure de
 *   microcopie, jamais visible une fois le label affiché au-dessus).
 */
type FieldFormState = Record<string, string>;
type FieldVariant = "placeholder" | "labeled";

function renderField<T extends FieldFormState>(
  rule: PropertyFieldRule,
  state: T,
  setState: Dispatch<SetStateAction<T>>,
  disabled: boolean,
  variant: FieldVariant,
) {
  // Mise à jour dynamique par clé (rule.key n'est pas statiquement connu de T) — assertion
  // nécessaire, la forme reste correcte à l'exécution (mêmes clés que le state d'origine).
  const setField = (value: string) =>
    setState((previous) => ({ ...previous, [rule.key]: value }) as T);

  const control =
    rule.kind === "boolean" ? (
      <select
        className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
        value={state[rule.key] ?? ""}
        onChange={(event) => setField(event.target.value)}
        disabled={disabled}
      >
        <option value="true">{rule.placeholder}: Oui</option>
        <option value="false">{rule.placeholder}: Non</option>
      </select>
    ) : (
      <Input
        type={rule.kind === "number" ? "number" : undefined}
        min={rule.kind === "number" ? 0 : undefined}
        step={rule.kind === "number" ? 1 : undefined}
        value={state[rule.key] ?? ""}
        onChange={(event) => setField(event.target.value)}
        placeholder={variant === "labeled" ? `${rule.placeholder} (${rule.key})` : rule.placeholder}
        disabled={disabled}
      />
    );

  if (variant === "placeholder") {
    return <div key={rule.key}>{control}</div>;
  }

  return (
    <div key={rule.key} className="space-y-1">
      <p className="text-xs font-medium text-slate-700">{rule.placeholder}</p>
      {control}
    </div>
  );
}

function renderLogementBaseFields<T extends FieldFormState>(
  state: T,
  setState: Dispatch<SetStateAction<T>>,
  disabled: boolean,
  variant: FieldVariant,
) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {LOGEMENT_BASE_FIELDS.map((rule) => renderField(rule, state, setState, disabled, variant))}
    </div>
  );
}

export function renderExtraTypeFields<T extends FieldFormState>(
  typeProperty: ListingTypeValue,
  state: T,
  setState: Dispatch<SetStateAction<T>>,
  disabled: boolean,
  variant: FieldVariant = "placeholder",
) {
  const isLogementLike = LOGEMENT_LIKE_TYPES.has(typeProperty);
  const extraFields = PROPERTY_TYPE_EXTRA_FIELDS[typeProperty] ?? [];
  const gridColsClass = extraFields.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2";

  return (
    <>
      {isLogementLike ? renderLogementBaseFields(state, setState, disabled, variant) : null}

      {extraFields.length === 0 && !isLogementLike ? (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Ce type n&apos;a pas d&apos;attribut supplémentaire à l&apos;étape 2.
        </p>
      ) : null}

      {extraFields.length === 1 ? renderField(extraFields[0], state, setState, disabled, variant) : null}

      {extraFields.length >= 2 ? (
        <div className={`grid gap-3 ${gridColsClass}`}>
          {extraFields.map((rule) => renderField(rule, state, setState, disabled, variant))}
        </div>
      ) : null}
    </>
  );
}
