"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Search, Smartphone, Sparkles } from "lucide-react";
import { routes } from "@/constantes/routes";
import { TypeProperty, TypePropertyEnum } from "@/constantes/property-type";
import { GABON_PROVINCES } from "@/constantes/gabon-locations";
import {
  SEARCH_REQUEST_BASE_FEE_XAF,
  SEARCH_REQUEST_BOOST_FEE_XAF,
  SEARCH_REQUEST_DESCRIPTION_MAX_LENGTH,
  computeSearchRequestAmountXaf,
} from "@/constantes/search-requests";
import { PAYMENT_METHODS, detectNetworkFromPhone, isPhoneValidForNetwork } from "@/constantes/payment-methods";
import { useSearchRequestPayment } from "@/hooks/use-search-request-payment";
import type { TypePropertyKey } from "@trouve-ton-nkama/core/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface SearchRequestFormPrefill {
  typeProperty?: TypePropertyKey;
  city?: string;
  budgetMinXaf?: number;
  budgetMaxXaf?: number;
}

// Style d'input/select partagé, calqué sur SelectFormApp.tsx (min-h-12 rounded-full
// bg-gray-50 border-secondary focus:bg-primary-50) — même langage visuel que le
// reste des formulaires "modernes" de la plateforme (signup, complete-profile).
const FIELD_CLASS =
  "min-h-12 w-full rounded-full border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-colors focus-visible:border-secondary focus-visible:bg-primary-50 focus-visible:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-white";
const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";
const PRIMARY_CTA_CLASS =
  "h-12 w-full rounded-full bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-teal-500/25 hover:from-primary-800 hover:to-primary-600 disabled:opacity-40 disabled:shadow-none";

export default function SearchRequestForm({ prefill }: { prefill?: SearchRequestFormPrefill }) {
  const router = useRouter();
  const [typeProperty, setTypeProperty] = React.useState<TypePropertyKey | "">(prefill?.typeProperty ?? "");
  const [transactionType, setTransactionType] = React.useState<"FOR_RENT" | "FOR_SALE">("FOR_RENT");
  const [province, setProvince] = React.useState(GABON_PROVINCES[0].name);
  const [city, setCity] = React.useState(prefill?.city ?? "");
  const [neighborhood, setNeighborhood] = React.useState("");
  const [budgetMinXaf, setBudgetMinXaf] = React.useState(prefill?.budgetMinXaf ?? 0);
  const [budgetMaxXaf, setBudgetMaxXaf] = React.useState(prefill?.budgetMaxXaf ?? 0);
  const [description, setDescription] = React.useState("");
  const [whatsappContact, setWhatsappContact] = React.useState("");
  const [boostRequested, setBoostRequested] = React.useState(false);
  const [payerPhone, setPayerPhone] = React.useState("");
  const [network, setNetwork] = React.useState<"AM" | "MM">("AM");

  const { phase, error, submitSearchRequest, reset } = useSearchRequestPayment();

  React.useEffect(() => {
    const detected = detectNetworkFromPhone(payerPhone);
    if (detected) setNetwork(detected);
  }, [payerPhone]);

  const amountXaf = computeSearchRequestAmountXaf(boostRequested);
  const budgetValid = budgetMinXaf >= 0 && budgetMaxXaf > 0 && budgetMinXaf <= budgetMaxXaf;
  const descriptionValid = description.trim().length >= 10;
  const whatsappValid = whatsappContact.trim().length >= 6;
  const payerPhoneValid = isPhoneValidForNetwork(payerPhone, network);
  const canSubmit =
    Boolean(typeProperty) &&
    Boolean(city.trim()) &&
    budgetValid &&
    descriptionValid &&
    whatsappValid &&
    payerPhoneValid &&
    phase === "idle";

  const handleSubmit = () => {
    if (!canSubmit || !typeProperty) return;
    void submitSearchRequest({
      typeProperty,
      transactionType,
      province,
      city: city.trim(),
      neighborhood: neighborhood.trim() || undefined,
      budgetMinXaf,
      budgetMaxXaf,
      description: description.trim(),
      whatsappContact: whatsappContact.trim(),
      payerPhone,
      network,
      boostRequested,
    });
  };

  if (phase === "success") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 px-5 py-16 text-center">
        <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        <p className="text-xl font-semibold text-gray-900 dark:text-white">Demande envoyée, merci !</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Votre demande est en attente de validation par notre équipe. Elle sera publiée sous peu.
        </p>
        <Button type="button" onClick={() => router.push(routes.public.search_requests)} className={`mt-2 ${PRIMARY_CTA_CLASS} w-auto px-8`}>
          Voir les demandes de recherche
        </Button>
      </div>
    );
  }

  if (phase === "waiting_confirmation") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 px-5 py-16 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-secondary" />
        <p className="text-lg font-semibold text-gray-900 dark:text-white">
          Confirme le paiement sur ton téléphone
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Tape ton code Mobile Money pour valider le paiement de{" "}
          {amountXaf.toLocaleString("fr-FR")} FCFA.
        </p>
      </div>
    );
  }

  if (phase === "failed" || phase === "timeout") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 px-5 py-16 text-center">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg font-semibold text-gray-900 dark:text-white">Paiement non abouti</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
        <Button type="button" onClick={reset} className={`mt-2 ${PRIMARY_CTA_CLASS} w-auto px-8`}>
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <section className="mb-8 space-y-3 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-2">
          <Search className="w-5 h-5 text-secondary" />
          <span className="font-semibold text-primary dark:text-secondary">Publier ma recherche</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
          Décrivez exactement ce que vous cherchez
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Votre demande sera visible publiquement après validation, pour que les annonceurs
          puissent vous contacter directement sur WhatsApp.
        </p>
      </section>

      <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS}>Type de bien</label>
            <Select value={typeProperty} onValueChange={(value) => setTypeProperty(value as TypePropertyKey)}>
              <SelectTrigger aria-label="Type de bien" className={FIELD_CLASS}>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(TypePropertyEnum).map((key) => (
                  <SelectItem key={key} value={key}>
                    {TypeProperty[key] ?? key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Location ou vente</label>
            <Select value={transactionType} onValueChange={(value) => setTransactionType(value as "FOR_RENT" | "FOR_SALE")}>
              <SelectTrigger aria-label="Location ou vente" className={FIELD_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FOR_RENT">Location</SelectItem>
                <SelectItem value="FOR_SALE">Vente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Province</label>
            <Select value={province} onValueChange={setProvince}>
              <SelectTrigger aria-label="Province" className={FIELD_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GABON_PROVINCES.map((p) => (
                  <SelectItem key={p.name} value={p.name}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Ville</label>
            <Input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex: Libreville"
              className={FIELD_CLASS}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS}>Quartier (optionnel)</label>
            <Input
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="Ex: Nzeng-Ayong"
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Budget min (FCFA)</label>
            <Input
              type="number"
              inputMode="numeric"
              value={budgetMinXaf || ""}
              onChange={(e) => setBudgetMinXaf(Number(e.target.value) || 0)}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Budget max (FCFA)</label>
            <Input
              type="number"
              inputMode="numeric"
              value={budgetMaxXaf || ""}
              onChange={(e) => setBudgetMaxXaf(Number(e.target.value) || 0)}
              className={FIELD_CLASS}
            />
          </div>
        </div>
        {!budgetValid && (budgetMinXaf > 0 || budgetMaxXaf > 0) && (
          <p className="text-xs text-red-500">Le budget minimum doit être inférieur ou égal au budget maximum.</p>
        )}

        <div>
          <label className={LABEL_CLASS}>Décrivez précisément ce que vous cherchez</label>
          <Textarea
            value={description}
            maxLength={SEARCH_REQUEST_DESCRIPTION_MAX_LENGTH}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Ex: Je cherche un studio meublé proche du centre-ville, avec eau et électricité, disponible immédiatement..."
            className="rounded-2xl border-gray-200 bg-gray-50 px-4 py-3 text-sm focus-visible:border-secondary focus-visible:bg-primary-50 focus-visible:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
          {description && !descriptionValid && (
            <p className="mt-1 text-xs text-red-500">Description trop courte (10 caractères minimum).</p>
          )}
        </div>

        <div>
          <label className={LABEL_CLASS}>Votre numéro WhatsApp (visible publiquement pour être contacté)</label>
          <Input
            type="tel"
            value={whatsappContact}
            onChange={(e) => setWhatsappContact(e.target.value)}
            placeholder="074 XX XX XX"
            className={FIELD_CLASS}
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/30">
          <Checkbox
            checked={boostRequested}
            onCheckedChange={(checked) => setBoostRequested(checked === true)}
            className="mt-0.5 h-6 w-6 shrink-0"
          />
          <span className="flex-1 pt-1.5 text-sm text-amber-900 dark:text-amber-200">
            <span className="flex items-center gap-1 font-semibold">
              <Sparkles className="h-4 w-4" />
              Booster ma demande (+{SEARCH_REQUEST_BOOST_FEE_XAF.toLocaleString("fr-FR")} FCFA)
            </span>
            Top de liste et badge « recherche urgente » pendant 7 jours après validation.
          </span>
        </label>

        <div>
          <p className={LABEL_CLASS}>Votre numéro Mobile Money (pour le paiement)</p>
          <div className="mb-2 grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((method) => (
              <Button
                key={method.network}
                type="button"
                variant={network === method.network ? "default" : "outline"}
                onClick={() => setNetwork(method.network)}
                className="h-11 rounded-full"
              >
                {method.name}
              </Button>
            ))}
          </div>
          <div className="relative">
            <Smartphone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="tel"
              placeholder="074 XX XX XX"
              value={payerPhone}
              onChange={(e) => setPayerPhone(e.target.value)}
              className={`${FIELD_CLASS} pl-10`}
            />
          </div>
          {payerPhone && !payerPhoneValid && (
            <p className="mt-1 text-xs text-red-500">
              Numéro invalide pour ce réseau (Airtel : 074/077 — Moov : 062/065/066).
            </p>
          )}
        </div>

        <Button type="button" disabled={!canSubmit} onClick={handleSubmit} className={PRIMARY_CTA_CLASS}>
          {phase === "initiating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Publier ma recherche — {amountXaf.toLocaleString("fr-FR")} FCFA
        </Button>
        <p className="text-center text-xs text-gray-400">
          Publication {SEARCH_REQUEST_BASE_FEE_XAF.toLocaleString("fr-FR")} FCFA. Paiement sécurisé Mobile Money,
          validation par notre équipe avant mise en ligne.
        </p>
      </div>
    </div>
  );
}
