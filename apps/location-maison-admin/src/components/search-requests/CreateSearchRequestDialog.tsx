"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { Button } from "@trouve-ton-nkama/ui/button";
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
import { GABON_PROVINCES, TypeProperty, TypePropertyEnum } from "@trouve-ton-nkama/core/domain";

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
  boosted: boolean;
};

const EMPTY_FORM: FormState = {
  typeProperty: "",
  transactionType: "FOR_RENT",
  province: GABON_PROVINCES[0].name,
  city: "",
  neighborhood: "",
  budgetMinXaf: "",
  budgetMaxXaf: "",
  description: "",
  whatsappContact: "",
  boosted: false,
};

const FIELD_CLASS = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm";

async function createSearchRequest(form: FormState) {
  const response = await fetch("/api/admin/v1/search-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      typeProperty: form.typeProperty,
      transactionType: form.transactionType,
      province: form.province,
      city: form.city.trim(),
      neighborhood: form.neighborhood.trim() || undefined,
      budgetMinXaf: Number(form.budgetMinXaf || 0),
      budgetMaxXaf: Number(form.budgetMaxXaf || 0),
      description: form.description.trim(),
      whatsappContact: form.whatsappContact.trim(),
      boosted: form.boosted,
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload?.error?.message ?? "Impossible de créer la demande.");
  }
  return payload.data as { id: string };
}

/**
 * Saisie d'une demande de recherche par l'admin pour le compte d'un tiers.
 * Mêmes champs que le formulaire public, sans le bloc paiement : la demande est
 * publiée directement (aucune facturation, pas de passage en file de modération).
 */
export function CreateSearchRequestDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const mutation = useMutation({
    mutationFn: () => createSearchRequest(form),
    onSuccess: () => {
      setForm(EMPTY_FORM);
      setOpen(false);
      // La demande est publiée d'emblée : elle n'apparaît pas dans la file
      // "en attente", mais on rafraîchit aussi la cloche (compteurs globaux).
      void queryClient.invalidateQueries({ queryKey: ["search-requests-moderation"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Créer une demande
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une demande de recherche</DialogTitle>
          <DialogDescription>
            Pour saisir la demande d&apos;une personne qui vous contacte directement. Aucun paiement
            n&apos;est requis : la demande est publiée immédiatement.
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
              <option value="">Sélectionner...</option>
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
              placeholder="Ex: Studio meublé proche du centre-ville, eau et électricité, disponible immédiatement..."
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

          <label className="flex items-start gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.boosted}
              onChange={(e) => update("boosted", e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-muted-foreground">
              Mettre en avant 7 jours (badge « recherche urgente », en tête de liste) — offert, aucun
              montant n&apos;est facturé.
            </span>
          </label>
        </div>

        {!budgetValid && (budgetMin > 0 || budgetMax > 0) ? (
          <p className="text-xs text-destructive">
            Le budget minimum doit être inférieur ou égal au budget maximum.
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
            {mutation.isPending ? "Création..." : "Créer et publier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
