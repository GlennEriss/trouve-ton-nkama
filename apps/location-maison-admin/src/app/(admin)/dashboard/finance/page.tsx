"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui-kit/page-header";

type AuthMePayload = {
  admin: {
    permissions: string[];
  };
};

type WalletItem = {
  uid: string;
  fullName: string;
  email: string | null;
  roles: string[];
  credits: number;
  isSuspended: boolean;
  state: string | null;
  presenceStatus: "online" | "offline";
  lastSeenAt: string | null;
};

type WalletsPayload = {
  wallets: WalletItem[];
  count: number;
  summary: {
    totalCreditsOnPage: number;
    totalWalletsOnPage: number;
    onlineWalletsOnPage: number;
    suspendedWalletsOnPage: number;
  };
  page: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

type TransactionItem = {
  id: string;
  uid: string | null;
  type: string;
  status: string;
  credits: number;
  amount: number | null;
  description: string | null;
  provider: string | null;
  createdAt: string | null;
};

type TransactionsPayload = {
  transactions: TransactionItem[];
  count: number;
  summary: {
    totalCreditsDeltaOnPage: number;
    totalPurchaseCreditsOnPage: number;
    totalSpendCreditsOnPage: number;
    totalGrantCreditsOnPage: number;
  };
  page: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

type RefundItem = {
  id: string;
  phoneNumber: string | null;
  amount: number | null;
  status: string;
  reason: string | null;
  createdAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
};

type RefundsPayload = {
  refunds: RefundItem[];
  count: number;
  summary: {
    pendingOnPage: number;
    approvedOnPage: number;
    rejectedOnPage: number;
  };
  page: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

type GrantPayload = {
  transactionId: string;
  uid: string;
  creditsGranted: number;
  previousCredits: number;
  currentCredits: number;
  reason: string;
  grantedAt: string;
  replayed: boolean;
};

function hasPermission(permissions: string[], required: string) {
  return permissions.includes("*.*") || permissions.includes(required);
}

function toDateLabel(value?: string | null) {
  if (!value) {
    return "Inconnu";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Inconnu";
  }
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatNumber(value: number | null | undefined) {
  const safe = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("fr-FR").format(safe);
}

function formatMoneyXaf(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(value);
}

async function fetchJson<T>(url: string, fallbackMessage: string) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json()) as
    | { success: true; data: T }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? fallbackMessage : payload.error?.message || fallbackMessage);
  }

  return payload.data;
}

export default function FinanceDashboardPage() {
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [walletQueryDraft, setWalletQueryDraft] = useState("");
  const [walletQueryApplied, setWalletQueryApplied] = useState("");
  const [walletRole, setWalletRole] = useState<"all" | "user" | "announcer" | "admin">("all");
  const [walletStatus, setWalletStatus] = useState<"all" | "active" | "suspended" | "archived">("all");
  const [walletPresence, setWalletPresence] = useState<"all" | "online" | "offline">("all");
  const [walletCursor, setWalletCursor] = useState<string | null>(null);
  const [walletCursorHistory, setWalletCursorHistory] = useState<string[]>([]);

  const [txQueryDraft, setTxQueryDraft] = useState("");
  const [txQueryApplied, setTxQueryApplied] = useState("");
  const [txUidDraft, setTxUidDraft] = useState("");
  const [txUidApplied, setTxUidApplied] = useState("");
  const [txType, setTxType] = useState<"all" | "purchase" | "spend" | "grant">("all");
  const [txStatus, setTxStatus] = useState<"all" | "pending" | "success" | "failed" | "cancelled">("all");
  const [txCreatedAfter, setTxCreatedAfter] = useState("");
  const [txCreatedBefore, setTxCreatedBefore] = useState("");
  const [txCursor, setTxCursor] = useState<string | null>(null);
  const [txCursorHistory, setTxCursorHistory] = useState<string[]>([]);

  const [refundQueryDraft, setRefundQueryDraft] = useState("");
  const [refundQueryApplied, setRefundQueryApplied] = useState("");
  const [refundStatus, setRefundStatus] = useState<
    "all" | "pending" | "approved" | "rejected" | "failed" | "success"
  >("all");
  const [refundCursor, setRefundCursor] = useState<string | null>(null);
  const [refundCursorHistory, setRefundCursorHistory] = useState<string[]>([]);
  const [isReviewingRefundId, setIsReviewingRefundId] = useState<string | null>(null);

  const [grantUid, setGrantUid] = useState("");
  const [grantCredits, setGrantCredits] = useState("3");
  const [grantReason, setGrantReason] = useState("Attribution manuelle admin");
  const [isGranting, setIsGranting] = useState(false);

  const permissionsQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () =>
      fetchJson<AuthMePayload>("/api/admin/v1/auth/me", "Impossible de charger les permissions."),
  });

  const permissions = permissionsQuery.data?.admin.permissions ?? [];
  const canReadCredits = useMemo(() => hasPermission(permissions, "credits.read"), [permissions]);
  const canGrantCredits = useMemo(() => hasPermission(permissions, "credits.grant"), [permissions]);
  const canReadTransactions = useMemo(() => hasPermission(permissions, "transactions.read"), [permissions]);
  const canReadRefunds = useMemo(() => hasPermission(permissions, "refunds.read"), [permissions]);
  const canApproveRefunds = useMemo(() => hasPermission(permissions, "refunds.approve"), [permissions]);

  const walletsQuery = useQuery({
    queryKey: [
      "finance",
      "wallets",
      walletQueryApplied,
      walletRole,
      walletStatus,
      walletPresence,
      walletCursor,
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("limit", "40");
      if (walletCursor) params.set("cursor", walletCursor);
      if (walletQueryApplied) params.set("query", walletQueryApplied);
      params.set("role", walletRole);
      params.set("status", walletStatus);
      params.set("presence", walletPresence);
      return fetchJson<WalletsPayload>(
        `/api/admin/v1/credits/wallets?${params.toString()}`,
        "Impossible de charger les portefeuilles.",
      );
    },
    enabled: canReadCredits,
  });

  const transactionsQuery = useQuery({
    queryKey: [
      "finance",
      "transactions",
      txQueryApplied,
      txUidApplied,
      txType,
      txStatus,
      txCreatedAfter,
      txCreatedBefore,
      txCursor,
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("limit", "40");
      if (txCursor) params.set("cursor", txCursor);
      if (txQueryApplied) params.set("query", txQueryApplied);
      if (txUidApplied) params.set("uid", txUidApplied);
      params.set("type", txType);
      params.set("status", txStatus);
      if (txCreatedAfter) params.set("createdAfter", txCreatedAfter);
      if (txCreatedBefore) params.set("createdBefore", txCreatedBefore);
      return fetchJson<TransactionsPayload>(
        `/api/admin/v1/transactions?${params.toString()}`,
        "Impossible de charger les transactions.",
      );
    },
    enabled: canReadTransactions,
  });

  const refundsQuery = useQuery({
    queryKey: ["finance", "refunds", refundQueryApplied, refundStatus, refundCursor],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("limit", "40");
      if (refundCursor) params.set("cursor", refundCursor);
      if (refundQueryApplied) params.set("query", refundQueryApplied);
      params.set("status", refundStatus);
      return fetchJson<RefundsPayload>(
        `/api/admin/v1/refunds?${params.toString()}`,
        "Impossible de charger les remboursements.",
      );
    },
    enabled: canReadRefunds,
  });

  const refreshAll = useCallback(() => {
    void walletsQuery.refetch();
    void transactionsQuery.refetch();
    void refundsQuery.refetch();
  }, [refundsQuery, transactionsQuery, walletsQuery]);

  const applyWalletFilters = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setWalletQueryApplied(walletQueryDraft.trim());
      setWalletCursor(null);
      setWalletCursorHistory([]);
    },
    [walletQueryDraft],
  );

  const resetWalletFilters = useCallback(() => {
    setWalletQueryDraft("");
    setWalletQueryApplied("");
    setWalletRole("all");
    setWalletStatus("all");
    setWalletPresence("all");
    setWalletCursor(null);
    setWalletCursorHistory([]);
  }, []);

  const applyTxFilters = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setTxQueryApplied(txQueryDraft.trim());
      setTxUidApplied(txUidDraft.trim());
      setTxCursor(null);
      setTxCursorHistory([]);
    },
    [txQueryDraft, txUidDraft],
  );

  const resetTxFilters = useCallback(() => {
    setTxQueryDraft("");
    setTxQueryApplied("");
    setTxUidDraft("");
    setTxUidApplied("");
    setTxType("all");
    setTxStatus("all");
    setTxCreatedAfter("");
    setTxCreatedBefore("");
    setTxCursor(null);
    setTxCursorHistory([]);
  }, []);

  const applyRefundFilters = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setRefundQueryApplied(refundQueryDraft.trim());
      setRefundCursor(null);
      setRefundCursorHistory([]);
    },
    [refundQueryDraft],
  );

  const resetRefundFilters = useCallback(() => {
    setRefundQueryDraft("");
    setRefundQueryApplied("");
    setRefundStatus("all");
    setRefundCursor(null);
    setRefundCursorHistory([]);
  }, []);

  const submitGrant = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setGlobalError(null);
      setGlobalMessage(null);

      const parsedCredits = Number(grantCredits);
      if (!Number.isFinite(parsedCredits) || parsedCredits <= 0) {
        setGlobalError("Le nombre de crédits doit être supérieur à 0.");
        return;
      }

      setIsGranting(true);
      try {
        const response = await fetch("/api/admin/v1/credits/grants", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "idempotency-key":
              crypto.randomUUID?.() ?? `credits-grant-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          },
          body: JSON.stringify({
            uid: grantUid.trim(),
            credits: parsedCredits,
            reason: grantReason.trim(),
          }),
        });

        const payload = (await response.json()) as
          | { success: true; data: GrantPayload }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Impossible d'attribuer les crédits." : payload.error?.message);
        }

        setGlobalMessage(
          `Crédits attribués avec succès: ${payload.data.creditsGranted} crédit(s) pour ${payload.data.uid}.`,
        );
        setGrantUid("");
        await Promise.all([walletsQuery.refetch(), transactionsQuery.refetch()]);
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Impossible d'attribuer les crédits.");
      } finally {
        setIsGranting(false);
      }
    },
    [grantCredits, grantReason, grantUid, transactionsQuery, walletsQuery],
  );

  const reviewRefund = useCallback(
    async (refundId: string, status: "approved" | "rejected") => {
      setGlobalError(null);
      setGlobalMessage(null);
      setIsReviewingRefundId(refundId);

      try {
        const response = await fetch(`/api/admin/v1/refunds/${refundId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        });

        const payload = (await response.json()) as
          | { success: true; data: { previousStatus: string; nextStatus: string } }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Impossible de mettre à jour le remboursement." : payload.error?.message);
        }

        setGlobalMessage(`Remboursement ${refundId} mis à jour (${payload.data.nextStatus}).`);
        await refundsQuery.refetch();
      } catch (error) {
        setGlobalError(
          error instanceof Error ? error.message : "Impossible de mettre à jour le remboursement.",
        );
      } finally {
        setIsReviewingRefundId(null);
      }
    },
    [refundsQuery],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance et crédits"
        description="Pilotage opérationnel des crédits, transactions et remboursements."
        actions={
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={refreshAll}
            disabled={walletsQuery.isFetching || transactionsQuery.isFetching || refundsQuery.isFetching}
          >
            <RefreshCcw className="h-4 w-4" />
            Actualiser
          </Button>
        }
      />

      {globalError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {globalError}
        </div>
      ) : null}

      {globalMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {globalMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border-border/80">
          <CardHeader className="pb-2 text-sm font-medium text-muted-foreground">
            Crédits (page courante)
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatNumber(walletsQuery.data?.summary.totalCreditsOnPage ?? 0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatNumber(walletsQuery.data?.summary.totalWalletsOnPage ?? 0)} portefeuille(s)
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80">
          <CardHeader className="pb-2 text-sm font-medium text-muted-foreground">
            Transactions (page courante)
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatNumber(transactionsQuery.data?.summary.totalCreditsDeltaOnPage ?? 0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              +{formatNumber(transactionsQuery.data?.summary.totalPurchaseCreditsOnPage ?? 0)} achats / -
              {formatNumber(transactionsQuery.data?.summary.totalSpendCreditsOnPage ?? 0)} dépenses
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80">
          <CardHeader className="pb-2 text-sm font-medium text-muted-foreground">
            Remboursements (page courante)
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatNumber(refundsQuery.data?.summary.pendingOnPage ?? 0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              en attente ({formatNumber(refundsQuery.data?.count ?? 0)} ligne(s))
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/80">
        <CardHeader className="pb-2 text-base font-semibold">Attribution manuelle de crédits</CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={submitGrant}>
            <Input
              value={grantUid}
              onChange={(event) => setGrantUid(event.target.value)}
              placeholder="UID utilisateur"
              disabled={!canGrantCredits || isGranting}
            />
            <Input
              value={grantCredits}
              onChange={(event) => setGrantCredits(event.target.value)}
              placeholder="Crédits"
              type="number"
              min={1}
              disabled={!canGrantCredits || isGranting}
            />
            <Input
              value={grantReason}
              onChange={(event) => setGrantReason(event.target.value)}
              placeholder="Motif"
              disabled={!canGrantCredits || isGranting}
            />
            <Button type="submit" disabled={!canGrantCredits || isGranting}>
              {isGranting ? "Attribution..." : "Attribuer"}
            </Button>
          </form>
          {!canGrantCredits ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Permission requise: <code>credits.grant</code>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80">
        <CardHeader className="pb-2 text-base font-semibold">Portefeuilles crédits</CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-2 md:grid-cols-6" onSubmit={applyWalletFilters}>
            <Input
              value={walletQueryDraft}
              onChange={(event) => setWalletQueryDraft(event.target.value)}
              placeholder="Rechercher UID, nom, email..."
              disabled={!canReadCredits}
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={walletRole}
              onChange={(event) => setWalletRole(event.target.value as typeof walletRole)}
              disabled={!canReadCredits}
            >
              <option value="all">Rôle: Tous</option>
              <option value="user">User</option>
              <option value="announcer">Announcer</option>
              <option value="admin">Admin</option>
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={walletStatus}
              onChange={(event) => setWalletStatus(event.target.value as typeof walletStatus)}
              disabled={!canReadCredits}
            >
              <option value="all">Statut: Tous</option>
              <option value="active">Actif</option>
              <option value="suspended">Suspendu</option>
              <option value="archived">Archivé</option>
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={walletPresence}
              onChange={(event) => setWalletPresence(event.target.value as typeof walletPresence)}
              disabled={!canReadCredits}
            >
              <option value="all">Présence: Tous</option>
              <option value="online">En ligne</option>
              <option value="offline">Hors ligne</option>
            </select>
            <Button type="submit" variant="outline" disabled={!canReadCredits}>
              Appliquer
            </Button>
            <Button type="button" variant="ghost" onClick={resetWalletFilters} disabled={!canReadCredits}>
              Réinitialiser
            </Button>
          </form>

          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">UID</th>
                  <th className="px-3 py-2 font-medium">Utilisateur</th>
                  <th className="px-3 py-2 font-medium">Rôles</th>
                  <th className="px-3 py-2 font-medium">Crédits</th>
                  <th className="px-3 py-2 font-medium">Statut</th>
                  <th className="px-3 py-2 font-medium">Présence</th>
                  <th className="px-3 py-2 font-medium">Dernière activité</th>
                </tr>
              </thead>
              <tbody>
                {(walletsQuery.data?.wallets ?? []).map((wallet) => (
                  <tr key={wallet.uid} className="border-t align-top">
                    <td className="px-3 py-2 font-mono text-xs">{wallet.uid}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium">{wallet.fullName}</p>
                      <p className="text-xs text-muted-foreground">{wallet.email ?? "Email inconnu"}</p>
                    </td>
                    <td className="px-3 py-2">{wallet.roles.join(", ") || "N/A"}</td>
                    <td className="px-3 py-2 font-semibold">{formatNumber(wallet.credits)}</td>
                    <td className="px-3 py-2">
                      {wallet.isSuspended ? "Suspendu" : wallet.state === "ARCHIVED" ? "Archivé" : "Actif"}
                    </td>
                    <td className="px-3 py-2">{wallet.presenceStatus === "online" ? "En ligne" : "Hors ligne"}</td>
                    <td className="px-3 py-2">{toDateLabel(wallet.lastSeenAt)}</td>
                  </tr>
                ))}
                {walletsQuery.data && walletsQuery.data.wallets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                      Aucun portefeuille trouvé.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{formatNumber(walletsQuery.data?.count ?? 0)} ligne(s)</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (walletCursorHistory.length === 0) return;
                  const previous = walletCursorHistory[walletCursorHistory.length - 1] ?? "";
                  setWalletCursorHistory((old) => old.slice(0, -1));
                  setWalletCursor(previous || null);
                }}
                disabled={walletCursorHistory.length === 0}
              >
                Précédent
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const nextCursor = walletsQuery.data?.page.nextCursor;
                  if (!nextCursor) return;
                  setWalletCursorHistory((old) => [...old, walletCursor ?? ""]);
                  setWalletCursor(nextCursor);
                }}
                disabled={!walletsQuery.data?.page.hasMore}
              >
                Suivant
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80">
        <CardHeader className="pb-2 text-base font-semibold">Transactions crédits</CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-2 md:grid-cols-8" onSubmit={applyTxFilters}>
            <Input
              value={txQueryDraft}
              onChange={(event) => setTxQueryDraft(event.target.value)}
              placeholder="Recherche globale..."
              disabled={!canReadTransactions}
            />
            <Input
              value={txUidDraft}
              onChange={(event) => setTxUidDraft(event.target.value)}
              placeholder="UID"
              disabled={!canReadTransactions}
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={txType}
              onChange={(event) => setTxType(event.target.value as typeof txType)}
              disabled={!canReadTransactions}
            >
              <option value="all">Type: Tous</option>
              <option value="purchase">Purchase</option>
              <option value="spend">Spend</option>
              <option value="grant">Grant</option>
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={txStatus}
              onChange={(event) => setTxStatus(event.target.value as typeof txStatus)}
              disabled={!canReadTransactions}
            >
              <option value="all">Statut: Tous</option>
              <option value="pending">Pending</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Input
              type="date"
              value={txCreatedAfter}
              onChange={(event) => setTxCreatedAfter(event.target.value)}
              disabled={!canReadTransactions}
            />
            <Input
              type="date"
              value={txCreatedBefore}
              onChange={(event) => setTxCreatedBefore(event.target.value)}
              disabled={!canReadTransactions}
            />
            <Button type="submit" variant="outline" disabled={!canReadTransactions}>
              Appliquer
            </Button>
            <Button type="button" variant="ghost" onClick={resetTxFilters} disabled={!canReadTransactions}>
              Réinitialiser
            </Button>
          </form>

          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">UID</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Crédits</th>
                  <th className="px-3 py-2 font-medium">Montant</th>
                  <th className="px-3 py-2 font-medium">Statut</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {(transactionsQuery.data?.transactions ?? []).map((tx) => (
                  <tr key={tx.id} className="border-t align-top">
                    <td className="px-3 py-2">{toDateLabel(tx.createdAt)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{tx.uid ?? "N/A"}</td>
                    <td className="px-3 py-2">{tx.type}</td>
                    <td className="px-3 py-2 font-semibold">{formatNumber(tx.credits)}</td>
                    <td className="px-3 py-2">{formatMoneyXaf(tx.amount)}</td>
                    <td className="px-3 py-2">{tx.status}</td>
                    <td className="px-3 py-2">
                      <p className="max-w-[340px]">{tx.description ?? "N/A"}</p>
                      <p className="text-xs text-muted-foreground">{tx.provider ?? "N/A"}</p>
                    </td>
                  </tr>
                ))}
                {transactionsQuery.data && transactionsQuery.data.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                      Aucune transaction trouvée.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {formatNumber(transactionsQuery.data?.count ?? 0)} ligne(s)
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (txCursorHistory.length === 0) return;
                  const previous = txCursorHistory[txCursorHistory.length - 1] ?? "";
                  setTxCursorHistory((old) => old.slice(0, -1));
                  setTxCursor(previous || null);
                }}
                disabled={txCursorHistory.length === 0}
              >
                Précédent
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const nextCursor = transactionsQuery.data?.page.nextCursor;
                  if (!nextCursor) return;
                  setTxCursorHistory((old) => [...old, txCursor ?? ""]);
                  setTxCursor(nextCursor);
                }}
                disabled={!transactionsQuery.data?.page.hasMore}
              >
                Suivant
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80">
        <CardHeader className="pb-2 text-base font-semibold">Remboursements</CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-2 md:grid-cols-5" onSubmit={applyRefundFilters}>
            <Input
              value={refundQueryDraft}
              onChange={(event) => setRefundQueryDraft(event.target.value)}
              placeholder="Rechercher id, numéro, motif..."
              disabled={!canReadRefunds}
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={refundStatus}
              onChange={(event) => setRefundStatus(event.target.value as typeof refundStatus)}
              disabled={!canReadRefunds}
            >
              <option value="all">Statut: Tous</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
            <Button type="submit" variant="outline" disabled={!canReadRefunds}>
              Appliquer
            </Button>
            <Button type="button" variant="ghost" onClick={resetRefundFilters} disabled={!canReadRefunds}>
              Réinitialiser
            </Button>
            <div />
          </form>

          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Numéro</th>
                  <th className="px-3 py-2 font-medium">Montant</th>
                  <th className="px-3 py-2 font-medium">Statut</th>
                  <th className="px-3 py-2 font-medium">Motif</th>
                  <th className="px-3 py-2 font-medium">Revue</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(refundsQuery.data?.refunds ?? []).map((refund) => (
                  <tr key={refund.id} className="border-t align-top">
                    <td className="px-3 py-2">{toDateLabel(refund.createdAt)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{refund.phoneNumber ?? "N/A"}</td>
                    <td className="px-3 py-2">{formatMoneyXaf(refund.amount)}</td>
                    <td className="px-3 py-2">{refund.status}</td>
                    <td className="px-3 py-2">{refund.reason ?? "N/A"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {refund.reviewedBy ?? "N/A"}<br />
                      {toDateLabel(refund.reviewedAt)}
                    </td>
                    <td className="px-3 py-2">
                      {canApproveRefunds && refund.status.toLowerCase() === "pending" ? (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8"
                            disabled={isReviewingRefundId === refund.id}
                            onClick={() => reviewRefund(refund.id, "approved")}
                          >
                            Approuver
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8"
                            disabled={isReviewingRefundId === refund.id}
                            onClick={() => reviewRefund(refund.id, "rejected")}
                          >
                            Rejeter
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Aucune action</span>
                      )}
                    </td>
                  </tr>
                ))}
                {refundsQuery.data && refundsQuery.data.refunds.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                      Aucun remboursement trouvé.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{formatNumber(refundsQuery.data?.count ?? 0)} ligne(s)</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (refundCursorHistory.length === 0) return;
                  const previous = refundCursorHistory[refundCursorHistory.length - 1] ?? "";
                  setRefundCursorHistory((old) => old.slice(0, -1));
                  setRefundCursor(previous || null);
                }}
                disabled={refundCursorHistory.length === 0}
              >
                Précédent
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const nextCursor = refundsQuery.data?.page.nextCursor;
                  if (!nextCursor) return;
                  setRefundCursorHistory((old) => [...old, refundCursor ?? ""]);
                  setRefundCursor(nextCursor);
                }}
                disabled={!refundsQuery.data?.page.hasMore}
              >
                Suivant
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {(!canReadCredits || !canReadTransactions || !canReadRefunds) && permissions.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Certaines sections ne sont pas visibles avec vos permissions actuelles.
        </div>
      ) : null}
    </div>
  );
}
