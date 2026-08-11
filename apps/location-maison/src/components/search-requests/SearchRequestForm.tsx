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

export interface SearchRequestFormPrefill {
  typeProperty?: TypePropertyKey;
  city?: string;
  budgetMinXaf?: number;
  budgetMaxXaf?: number;
}

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

  const isBusy = phase === "initiating" || phase === "waiting_confirmation";

  if (phase === "success") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 px-5 py-16 text-center">
        <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        <p className="text-xl font-semibold text-ink dark:text-white">Demande envoyée, merci !</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Votre demande est en attente de validation par notre équipe. Elle sera publiée sous peu.
        </p>
        <button
          type="button"
          onClick={() => router.push(routes.public.search_requests)}
          className="mt-2 rounded-full bg-secondary px-6 py-3 text-sm font-semibold text-white"
        >
          Voir les demandes de recherche
        </button>
      </div>
    );
  }

  if (phase === "waiting_confirmation") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 px-5 py-16 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-secondary" />
        <p className="text-lg font-semibold text-ink dark:text-white">
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
        <p className="text-lg font-semibold text-ink dark:text-white">Paiement non abouti</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-2 rounded-full bg-secondary px-6 py-3 text-sm font-semibold text-white"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 space-y-6">
      <section className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-2">
          <Search className="w-5 h-5 text-secondary" />
          <span className="font-semibold text-ink">Publier ma recherche</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-ink dark:text-white">
          Décrivez exactement ce que vous cherchez
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Votre demande sera visible publiquement après validation, pour que les annonceurs
          puissent vous contacter directement sur WhatsApp.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Type de bien
          </label>
          <select
            value={typeProperty}
            onChange={(e) => setTypeProperty(e.target.value as TypePropertyKey)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
          >
            <option value="">Sélectionner...</option>
            {Object.keys(TypePropertyEnum).map((key) => (
              <option key={key} value={key}>
                {TypeProperty[key] ?? key}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Location ou vente
          </label>
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value as "FOR_RENT" | "FOR_SALE")}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
          >
            <option value="FOR_RENT">Location</option>
            <option value="FOR_SALE">Vente</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Province
          </label>
          <select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
          >
            {GABON_PROVINCES.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Ville
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex: Libreville"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Quartier (optionnel)
          </label>
          <input
            type="text"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            placeholder="Ex: Nzeng-Ayong"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Budget min (FCFA)
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={budgetMinXaf || ""}
            onChange={(e) => setBudgetMinXaf(Number(e.target.value) || 0)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Budget max (FCFA)
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={budgetMaxXaf || ""}
            onChange={(e) => setBudgetMaxXaf(Number(e.target.value) || 0)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
          />
        </div>
      </div>
      {!budgetValid && (budgetMinXaf > 0 || budgetMaxXaf > 0) && (
        <p className="text-xs text-red-500">Le budget minimum doit être inférieur ou égal au budget maximum.</p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Décrivez précisément ce que vous cherchez
        </label>
        <textarea
          value={description}
          maxLength={SEARCH_REQUEST_DESCRIPTION_MAX_LENGTH}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Ex: Je cherche un studio meublé proche du centre-ville, avec eau et électricité, disponible immédiatement..."
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
        />
        {description && !descriptionValid && (
          <p className="mt-1 text-xs text-red-500">Description trop courte (10 caractères minimum).</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Votre numéro WhatsApp (visible publiquement pour être contacté)
        </label>
        <input
          type="tel"
          value={whatsappContact}
          onChange={(e) => setWhatsappContact(e.target.value)}
          placeholder="074 XX XX XX"
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
        />
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:bg-amber-950/30 dark:border-amber-700">
        <input
          type="checkbox"
          checked={boostRequested}
          onChange={(e) => setBoostRequested(e.target.checked)}
          className="h-4 w-4"
        />
        <span className="flex-1 text-sm text-amber-900 dark:text-amber-200">
          <span className="flex items-center gap-1 font-semibold">
            <Sparkles className="h-4 w-4" />
            Booster ma demande (+{SEARCH_REQUEST_BOOST_FEE_XAF.toLocaleString("fr-FR")} FCFA)
          </span>
          Top de liste et badge « recherche urgente » pendant 7 jours après validation.
        </span>
      </label>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Votre numéro Mobile Money (pour le paiement)
        </p>
        <div className="mb-2 grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method.network}
              type="button"
              onClick={() => setNetwork(method.network)}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                network === method.network
                  ? "border-secondary bg-secondary/10 text-secondary"
                  : "border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300"
              }`}
            >
              {method.name}
            </button>
          ))}
        </div>
        <div className="relative">
          <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="tel"
            placeholder="074 XX XX XX"
            value={payerPhone}
            onChange={(e) => setPayerPhone(e.target.value)}
            className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-sm dark:bg-gray-800 dark:border-gray-600"
          />
        </div>
        {payerPhone && !payerPhoneValid && (
          <p className="mt-1 text-xs text-red-500">
            Numéro invalide pour ce réseau (Airtel : 074/077 — Moov : 062/065/066).
          </p>
        )}
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-40"
      >
        {phase === "initiating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        Publier ma recherche — {amountXaf.toLocaleString("fr-FR")} FCFA
      </button>
      <p className="text-center text-xs text-gray-400">
        Publication {SEARCH_REQUEST_BASE_FEE_XAF.toLocaleString("fr-FR")} FCFA. Paiement sécurisé Mobile Money,
        validation par notre équipe avant mise en ligne.
      </p>
    </div>
  );
}
