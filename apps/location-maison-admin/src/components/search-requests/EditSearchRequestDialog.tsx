"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Input } from "@trouve-ton-nkama/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@trouve-ton-nkama/ui/button";
import { GABON_PROVINCES, TypeProperty, TypePropertyEnum } from "@trouve-ton-nkama/core/domain";
import type { SearchRequestListItem } from "@/modules/search-requests-moderation/domain/types";

type FormState = {
  typeProperty: string;
  transactionType: "FOR_RENT" | "FOR_SALE";
  province: string;
  city: string;
  neighborhood: string;
  budgetMinXaf: string;
  budgetMaxXaf: string;
  description: string;
  whatsappContact: string;
};

function toFormState(item: SearchRequestListItem): FormState {
  return {
    typeProperty: item.typeProperty,
    transactionType: item.transactionType,
    province: item.province,
    city: item.city,
    neighborhood: item.neighborhood ?? "",
    budgetMinXaf: String(item.budgetMinXaf),
    budgetMaxXaf: String(item.budgetMaxXaf),
    description: item.description,
    whatsappContact: item.whatsappContact,
  };
}

const FIELD_CLASS = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm";

async function updateSearchRequest(id: string, form: FormState) {
  const response = await fetch(`/api/admin/v1/search-requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      typeProperty: form.typeProperty,
      transactionType: form.transactionType,
      province: form.province,
      city: form.city.trim(),
      neighborhood: form.neighborhood.trim() || null,
      budgetMinXaf: Number(form.budgetMinXaf || 0),
      budgetMaxXaf: Number(form.budgetMaxXaf || 0),
      description: form.description.trim(),
      whatsappContact: form.whatsappContact.trim(),
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload?.error?.message ?? "Impossible de modifier la demande.");
  }
  return payload.data;
}

/**
 * Correction du contenu d'une demande déjà créée — erreur de saisie, budget mal interprété
 * depuis un message reçu par WhatsApp, etc. Utilisable aussi bien en file d'attente
 * (PENDING) que sur une demande déjà publiée : ne touche jamais moderationStatus/state.
 * Mêmes champs que CreateSearchRequestDialog, pré-remplis depuis `item`.
 */
export function EditSearchRequestDialog({
  item,
  trigger,
}: {
  item: SearchRequestListItem;
  trigger: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => toFormState(item));

  // Réinitialise le formulaire à CHAQUE ouverture (pas dans un effet — un event handler,
  // c'est le point de synchronisation naturel) : couvre à la fois "la liste a été rafraîchie
  // pendant que la modale était fermée" et "l'admin rouvre après avoir annulé sans enregistrer".
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setForm(toFormState(item));
    }
    setOpen(nextOpen);
  };

  const mutation = useMutation({
    mutationFn: () => updateSearchRequest(item.id, form),
    onSuccess: () => {
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["search-requests-moderation"] });
    },
  });

  const budgetMin = Number(form.budgetMinXaf || 0);
  const budgetMax = Number(form.budgetMaxXaf || 0);
  const budgetValid = budgetMax > 0 && budgetMin <= budgetMax;
  const canSubmit =
    Boolean(form.typeProperty) &&
    form.city.trim().length > 0 &&
    form.description.trim().length >= 10 &&
    form.whatsappContact.trim().length >= 6 &&
    budgetValid &&
    !mutation.isPending;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la demande</DialogTitle>
          <DialogDescription>
            Corrige le contenu saisi (budget, quartier, description...) sans changer son statut de
            modération ni de publication.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-foreground">Type de bien</span>
            <select
              value={form.typeProperty}
              onChange={(event) => update("typeProperty", event.target.value)}
              className={FIELD_CLASS}
            >
              {Object.keys(TypePropertyEnum).map((key) => (
                <option key={key} value={key}>
                  {TypeProperty[key] ?? key}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-foreground">Location ou vente</span>
            <select
              value={form.transactionType}
              onChange={(event) => update("transactionType", event.target.value as FormState["transactionType"])}
              className={FIELD_CLASS}
            >
              <option value="FOR_RENT">Location</option>
              <option value="FOR_SALE">Vente</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-foreground">Province</span>
            <select
              value={form.province}
              onChange={(event) => update("province", event.target.value)}
              className={FIELD_CLASS}
            >
              {GABON_PROVINCES.map((province) => (
                <option key={province.name} value={province.name}>
                  {province.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-foreground">Ville</span>
            <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Ex: Libreville" />
          </label>

          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm font-medium text-foreground">Quartier (optionnel)</span>
            <Input
              value={form.neighborhood}
              onChange={(e) => update("neighborhood", e.target.value)}
              placeholder="Ex: Nzeng-Ayong"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-foreground">Budget min (FCFA)</span>
            <Input
              type="number"
              inputMode="numeric"
              value={form.budgetMinXaf}
              onChange={(e) => update("budgetMinXaf", e.target.value)}
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-foreground">Budget max (FCFA)</span>
            <Input
              type="number"
              inputMode="numeric"
              value={form.budgetMaxXaf}
              onChange={(e) => update("budgetMaxXaf", e.target.value)}
            />
          </label>

          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm font-medium text-foreground">Ce que la personne recherche</span>
            <textarea
              rows={4}
              maxLength={1000}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className={FIELD_CLASS}
            />
          </label>

          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm font-medium text-foreground">
              Numéro WhatsApp de la personne (visible publiquement)
            </span>
            <Input
              type="tel"
              value={form.whatsappContact}
              onChange={(e) => update("whatsappContact", e.target.value)}
              placeholder="074 XX XX XX"
            />
          </label>
        </div>

        {!budgetValid ? (
          <p className="text-xs text-destructive">
            Le budget minimum doit être inférieur ou égal au budget maximum (un budget unique donné
            par la personne est un plafond : mettre 0 en minimum, pas la même valeur aux deux
            champs).
          </p>
        ) : null}
        {mutation.isError ? (
          <p className="text-xs text-destructive">
            {mutation.error instanceof Error ? mutation.error.message : "Une erreur est survenue."}
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
