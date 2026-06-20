"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui-kit/page-header";
import { KpiCard } from "@/components/ui-kit/kpi-card";
import AdCreativePreview from "@/components/advertising/AdCreativePreview";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type AdPlacement = "search_infeed" | "property_detail" | "home" | "immobilier_infeed";

const PLACEMENT_LABELS: Record<AdPlacement, string> = {
  search_infeed: "Recherche (in-feed)",
  property_detail: "Détail annonce",
  home: "Accueil",
  immobilier_infeed: "Immobilier (in-feed)",
};

const ALL_PLACEMENTS = Object.keys(PLACEMENT_LABELS) as AdPlacement[];

type Advertiser = { id: string; name: string; businessName?: string };

type Campaign = {
  id: string;
  advertiserId?: string | null;
  title: string;
  placements: AdPlacement[];
  status: string;
  priority: number;
  startDate: string | null;
  endDate: string | null;
  metrics: { impressions: number; clicks: number };
  billing: { paymentStatus: string; amount?: number };
  creative: { imageURL: string };
};

type CampaignsPayload = {
  campaigns: Campaign[];
  count: number;
  summary: { active: number; scheduled: number; pendingReview: number; ended: number; totalPaidAmount: number };
};

const STATUS_BADGE: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  active: "success",
  scheduled: "neutral",
  pending_review: "warning",
  paused: "warning",
  ended: "neutral",
  rejected: "danger",
  draft: "neutral",
};

async function fetchJson<T>(url: string, fallback: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const payload = (await res.json()) as
    | { success: true; data: T }
    | { success: false; error?: { message?: string } };
  if (!res.ok || !payload.success) {
    throw new Error(payload.success ? fallback : payload.error?.message || fallback);
  }
  return payload.data;
}

async function postJson<T>(url: string, body: unknown, fallback: string): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await res.json()) as
    | { success: true; data: T }
    | { success: false; error?: { message?: string } };
  if (!res.ok || !payload.success) {
    throw new Error(payload.success ? fallback : payload.error?.message || fallback);
  }
  return payload.data;
}

function formatXAF(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value) + " FCFA";
}

export default function AdvertisingDashboardPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const advertisersQuery = useQuery({
    queryKey: ["advertising", "advertisers"],
    queryFn: () => fetchJson<{ advertisers: Advertiser[] }>("/api/admin/v1/advertising/advertisers", "Impossible de charger les annonceurs."),
  });

  const campaignsQuery = useQuery({
    queryKey: ["advertising", "campaigns", statusFilter],
    queryFn: () =>
      fetchJson<CampaignsPayload>(
        `/api/admin/v1/advertising/campaigns?status=${encodeURIComponent(statusFilter)}`,
        "Impossible de charger les campagnes.",
      ),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["advertising"] });
  };
  const onError = (e: unknown) => setError(e instanceof Error ? e.message : "Erreur inattendue.");

  const advertisers = advertisersQuery.data?.advertisers ?? [];
  const summary = campaignsQuery.data?.summary;

  const advertiserName = useMemo(() => {
    const map = new Map(advertisers.map((a) => [a.id, a.businessName || a.name]));
    return (id?: string | null) => (id ? map.get(id) ?? id : "Annonceur externe");
  }, [advertisers]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Publicité"
        description="Régie publicitaire (concierge) — campagnes d'entreprises externes, facturées en FCFA."
        actions={
          <div className="flex items-center gap-2">
            <NewAdvertiserDialog onDone={(m) => { setMessage(m); invalidate(); }} onError={onError} />
            <NewCampaignDialog advertisers={advertisers} onDone={(m) => { setMessage(m); invalidate(); }} onError={onError} />
            <Button variant="outline" size="sm" onClick={() => invalidate()}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {message ? <p className="rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Campagnes actives" value={String(summary?.active ?? 0)} icon={<Megaphone className="h-4 w-4" />} />
        <KpiCard label="Programmées" value={String(summary?.scheduled ?? 0)} />
        <KpiCard label="À valider" value={String(summary?.pendingReview ?? 0)} />
        <KpiCard label="Total encaissé" value={formatXAF(summary?.totalPaidAmount ?? 0)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {["all", "active", "scheduled", "pending_review", "paused", "ended", "draft"].map((s) => (
          <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)}>
            {s === "all" ? "Toutes" : s}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {campaignsQuery.isLoading ? (
          <p className="text-sm text-slate-500">Chargement…</p>
        ) : (campaignsQuery.data?.campaigns.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-500">Aucune campagne.</p>
        ) : (
          campaignsQuery.data?.campaigns.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  {c.creative.imageURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.creative.imageURL} alt="" className="h-12 w-20 rounded object-cover" />
                  ) : null}
                  <div>
                    <p className="font-medium text-slate-900">{c.title}</p>
                    <p className="text-xs text-slate-500">{advertiserName(c.advertiserId)}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.placements.map((p) => (
                        <span key={p} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                          {PLACEMENT_LABELS[p]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>👁 {c.metrics.impressions} · 🖱 {c.metrics.clicks}</span>
                  <span>{c.billing.paymentStatus === "paid" ? formatXAF(c.billing.amount ?? 0) : "Non payé"}</span>
                  <Badge variant={STATUS_BADGE[c.status] ?? "neutral"}>{c.status}</Badge>
                  <CampaignActions campaign={c} onDone={(m) => { setMessage(m); invalidate(); }} onError={onError} />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

/** ===================== Actions par campagne ===================== */
function CampaignActions({ campaign, onDone, onError }: { campaign: Campaign; onDone: (m: string) => void; onError: (e: unknown) => void }) {
  const publishMutation = useMutation({
    mutationFn: () => postJson(`/api/admin/v1/advertising/campaigns/${campaign.id}/publish`, {}, "Échec de la publication."),
    onSuccess: () => onDone("Campagne publiée."),
    onError,
  });

  return (
    <div className="flex items-center gap-2">
      <RecordPaymentDialog campaignId={campaign.id} onDone={onDone} onError={onError} />
      {(campaign.status === "draft" || campaign.status === "pending_review" || campaign.status === "paused") && (
        <Button size="sm" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
          Publier
        </Button>
      )}
    </div>
  );
}

/** ===================== Dialog: nouvel annonceur ===================== */
function NewAdvertiserDialog({ onDone, onError }: { onDone: (m: string) => void; onError: (e: unknown) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      postJson("/api/admin/v1/advertising/advertisers", { name, businessName: businessName || undefined, contactPhone: contactPhone || undefined }, "Échec de la création."),
    onSuccess: () => { setOpen(false); setName(""); setBusinessName(""); setContactPhone(""); onDone("Annonceur créé."); },
    onError,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Nouvel annonceur</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouvel annonceur publicitaire</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Nom du contact *" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Nom de l'entreprise" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          <Input placeholder="Téléphone / WhatsApp" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || name.trim().length < 2}>Créer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** ===================== Dialog: nouvelle campagne ===================== */
function NewCampaignDialog({ advertisers, onDone, onError }: { advertisers: Advertiser[]; onDone: (m: string) => void; onError: (e: unknown) => void }) {
  const [open, setOpen] = useState(false);
  const [advertiserId, setAdvertiserId] = useState("");
  const [title, setTitle] = useState("");
  const [imageURL, setImageURL] = useState("");
  const [imagePATH, setImagePATH] = useState("");
  const [localPreview, setLocalPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [ctaUrl, setCtaUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [placements, setPlacements] = useState<AdPlacement[]>(["search_infeed"]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const toggle = (p: AdPlacement) =>
    setPlacements((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const handleUpload = async (file: File) => {
    // Aperçu instantané le temps que l'upload distant se termine.
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setUploadError(null);
    setImageURL("");
    setImagePATH("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/v1/advertising/upload", { method: "POST", body: fd });
      const payload = (await res.json()) as
        | { success: true; data: { imageURL: string; imagePATH: string } }
        | { success: false; error?: { message?: string } };
      if (!res.ok || !payload.success) {
        throw new Error(payload.success ? "Échec de l'upload." : payload.error?.message || "Échec de l'upload.");
      }
      setImageURL(payload.data.imageURL);
      setImagePATH(payload.data.imagePATH);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Échec de l'import du visuel.");
      onError(e);
    } finally {
      setUploading(false);
    }
  };

  const mutation = useMutation({
    mutationFn: () =>
      postJson(
        "/api/admin/v1/advertising/campaigns",
        {
          advertiserId: advertiserId || null,
          title,
          creative: {
            imageURL,
            imagePATH: imagePATH || undefined,
            ctaUrl: ctaUrl || undefined,
            ctaLabel: ctaLabel || undefined,
            headline: headline || undefined,
            body: body || undefined,
          },
          placements,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
        },
        "Échec de la création.",
      ),
    onSuccess: () => {
      setOpen(false);
      setLocalPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return ""; });
      onDone("Campagne créée (brouillon). Pensez à enregistrer le paiement puis publier.");
    },
    onError,
  });

  // Le champ « Annonceur » est volontairement optionnel (pub externe).
  const missing: string[] = [];
  if (title.trim().length < 2) missing.push("le titre");
  if (!imageURL.trim()) missing.push("le visuel importé");
  if (placements.length === 0) missing.push("au moins un emplacement");
  if (!startDate) missing.push("la date de début");
  if (!endDate) missing.push("la date de fin");
  const valid = missing.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Nouvelle campagne</DialogTrigger>
      <DialogContent className="max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto]">
        <DialogHeader><DialogTitle>Nouvelle campagne</DialogTitle></DialogHeader>
        <div className="space-y-3 overflow-y-auto pr-1">
          <select className="w-full rounded-md border px-3 py-2 text-sm" value={advertiserId} onChange={(e) => setAdvertiserId(e.target.value)}>
            <option value="">— Aucun annonceur plateforme (externe) —</option>
            {advertisers.map((a) => (<option key={a.id} value={a.id}>{a.businessName || a.name}</option>))}
          </select>
          <p className="text-xs text-slate-500">
            Optionnel : laisse vide si la publicité vient d'une personne ou d'une entreprise externe à la plateforme.
          </p>
          <Input placeholder="Titre de la campagne *" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="space-y-2">
            <label className="text-xs text-slate-500">Visuel de la pub *</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              disabled={uploading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f); }}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm"
            />
            {uploading ? <p className="text-xs text-slate-500">Upload en cours…</p> : null}
            {!uploading && imageURL ? (
              <p className="text-xs font-medium text-emerald-600">✓ Visuel importé</p>
            ) : null}
            {!uploading && !imageURL && localPreview ? (
              <p className="text-xs font-medium text-red-600">
                L&apos;import du visuel a échoué (l&apos;aperçu ci-dessous est local). {uploadError ? `Détail : ${uploadError}.` : ""} Réessaie de choisir le fichier.
              </p>
            ) : null}
          </div>
          <Input placeholder="Texte d'accroche" value={headline} onChange={(e) => setHeadline(e.target.value)} />
          <Input placeholder="Description courte (optionnel)" value={body} onChange={(e) => setBody(e.target.value)} />
          <Input placeholder="Texte du bouton (ex: Appeler, WhatsApp, Voir)" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
          <Input placeholder="Lien CTA (https / wa.me / tel:)" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {ALL_PLACEMENTS.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => toggle(p)}
                className={`rounded-full border px-3 py-1 text-xs ${placements.includes(p) ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"}`}
              >
                {PLACEMENT_LABELS[p]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <label className="flex-1 text-xs text-slate-500">Début<Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
            <label className="flex-1 text-xs text-slate-500">Fin<Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500">Aperçu avant publication</p>
            <AdCreativePreview
              creative={{
                imageURL: imageURL || localPreview || undefined,
                headline: headline || undefined,
                body: body || undefined,
                ctaLabel: ctaLabel || undefined,
                ctaUrl: ctaUrl || undefined,
              }}
              placements={placements}
            />
          </div>
        </div>
        <DialogFooter className="sm:flex-col sm:items-stretch">
          {!valid ? (
            <p className="text-xs text-amber-600">Pour publier, il manque encore : {missing.join(", ")}.</p>
          ) : null}
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !valid}>Créer la campagne</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** ===================== Dialog: enregistrer paiement ===================== */
function RecordPaymentDialog({ campaignId, onDone, onError }: { campaignId: string; onDone: (m: string) => void; onError: (e: unknown) => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("espèces");
  const [paymentReference, setPaymentReference] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      postJson(
        `/api/admin/v1/advertising/campaigns/${campaignId}/record-payment`,
        { amount: Number(amount), paymentMethod, paymentReference: paymentReference || undefined },
        "Échec de l'enregistrement.",
      ),
    onSuccess: () => { setOpen(false); setAmount(""); setPaymentReference(""); onDone("Paiement enregistré."); },
    onError,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Paiement</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Enregistrer un paiement (FCFA)</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input type="number" placeholder="Montant en FCFA *" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <select className="w-full rounded-md border px-3 py-2 text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="espèces">Espèces</option>
            <option value="airtel_money">Airtel Money</option>
            <option value="virement">Virement</option>
            <option value="autre">Autre</option>
          </select>
          <Input placeholder="Référence (n° reçu)" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !(Number(amount) > 0)}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
