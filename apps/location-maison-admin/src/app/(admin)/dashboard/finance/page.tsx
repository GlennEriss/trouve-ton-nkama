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

type CreditPackItem = {
  id: string;
  name: string;
  credits: number;
  price: number;
  savings: number | null;
  isActive: boolean;
  order: number;
  updatedAt: string | null;
};

type CreditPacksPayload = {
  packs: CreditPackItem[];
  count: number;
};

type AuditLogItem = {
  id: string;
  actorId: string | null;
  actorRoles: string[];
  action: string;
  resource: string | null;
  resourceId: string | null;
  status: string | null;
  createdAt: string | null;
  correlationId: string | null;
};

type AuditLogsPayload = {
  logs: AuditLogItem[];
  count: number;
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
  const [refundDecisionNote, setRefundDecisionNote] = useState("");

  const [packCreateId, setPackCreateId] = useState("");
  const [packCreateName, setPackCreateName] = useState("");
  const [packCreateCredits, setPackCreateCredits] = useState("5");
  const [packCreatePrice, setPackCreatePrice] = useState("2000");
  const [packCreateSavings, setPackCreateSavings] = useState("");
  const [packCreateOrder, setPackCreateOrder] = useState("0");
  const [packCreateActive, setPackCreateActive] = useState(true);
  const [isCreatingPack, setIsCreatingPack] = useState(false);

  const [packEditTargetId, setPackEditTargetId] = useState("");
  const [packEditName, setPackEditName] = useState("");
  const [packEditCredits, setPackEditCredits] = useState("");
  const [packEditPrice, setPackEditPrice] = useState("");
  const [packEditSavings, setPackEditSavings] = useState("");
  const [packEditOrder, setPackEditOrder] = useState("");
  const [packEditActive, setPackEditActive] = useState<"unchanged" | "true" | "false">("unchanged");
  const [isUpdatingPack, setIsUpdatingPack] = useState(false);
  const [isDeletingPackId, setIsDeletingPackId] = useState<string | null>(null);

  const [auditActionPrefix, setAuditActionPrefix] = useState("credits.");
  const [auditStatus, setAuditStatus] = useState<"all" | "success" | "failed" | "denied">("all");
  const [auditQueryDraft, setAuditQueryDraft] = useState("");
  const [auditQueryApplied, setAuditQueryApplied] = useState("");
  const [auditCursor, setAuditCursor] = useState<string | null>(null);
  const [auditCursorHistory, setAuditCursorHistory] = useState<string[]>([]);

  const permissionsQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () =>
      fetchJson<AuthMePayload>("/api/admin/v1/auth/me", "Impossible de charger les permissions."),
  });

  const permissions = permissionsQuery.data?.admin.permissions ?? [];
  const canReadCredits = useMemo(() => hasPermission(permissions, "credits.read"), [permissions]);
  const canGrantCredits = useMemo(() => hasPermission(permissions, "credits.grant"), [permissions]);
  const canManagePacks = useMemo(() => hasPermission(permissions, "credits.pack_manage"), [permissions]);
  const canReadTransactions = useMemo(() => hasPermission(permissions, "transactions.read"), [permissions]);
  const canReadRefunds = useMemo(() => hasPermission(permissions, "refunds.read"), [permissions]);
  const canApproveRefunds = useMemo(() => hasPermission(permissions, "refunds.approve"), [permissions]);
  const canReadAudit = useMemo(() => hasPermission(permissions, "audit_logs.read"), [permissions]);

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

  const packsQuery = useQuery({
    queryKey: ["finance", "packs"],
    queryFn: () =>
      fetchJson<CreditPacksPayload>("/api/admin/v1/credits/packs", "Impossible de charger les packs crédits."),
    enabled: canReadCredits,
  });

  const auditLogsQuery = useQuery({
    queryKey: [
      "finance",
      "audit-logs",
      auditActionPrefix,
      auditStatus,
      auditQueryApplied,
      auditCursor,
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("limit", "30");
      if (auditCursor) params.set("cursor", auditCursor);
      if (auditActionPrefix.trim()) params.set("actionPrefix", auditActionPrefix.trim());
      params.set("status", auditStatus);
      if (auditQueryApplied.trim()) params.set("query", auditQueryApplied.trim());
      return fetchJson<AuditLogsPayload>(
        `/api/admin/v1/audit/logs?${params.toString()}`,
        "Impossible de charger les logs d'audit.",
      );
    },
    enabled: canReadAudit,
  });

  const refreshAll = useCallback(() => {
    void walletsQuery.refetch();
    void transactionsQuery.refetch();
    void refundsQuery.refetch();
    void packsQuery.refetch();
    void auditLogsQuery.refetch();
  }, [auditLogsQuery, packsQuery, refundsQuery, transactionsQuery, walletsQuery]);

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

  const applyAuditFilters = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setAuditQueryApplied(auditQueryDraft.trim());
      setAuditCursor(null);
      setAuditCursorHistory([]);
    },
    [auditQueryDraft],
  );

  const resetAuditFilters = useCallback(() => {
    setAuditActionPrefix("credits.");
    setAuditStatus("all");
    setAuditQueryDraft("");
    setAuditQueryApplied("");
    setAuditCursor(null);
    setAuditCursorHistory([]);
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

  const exportCsv = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const createPack = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setGlobalError(null);
      setGlobalMessage(null);

      const credits = Number(packCreateCredits);
      const price = Number(packCreatePrice);
      const order = Number(packCreateOrder || "0");
      const savings = packCreateSavings.trim() ? Number(packCreateSavings.trim()) : null;
      if (!Number.isFinite(credits) || credits <= 0) {
        setGlobalError("Le nombre de crédits du pack est invalide.");
        return;
      }
      if (!Number.isFinite(price) || price < 0) {
        setGlobalError("Le prix du pack est invalide.");
        return;
      }

      setIsCreatingPack(true);
      try {
        const response = await fetch("/api/admin/v1/credits/packs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: packCreateId,
            name: packCreateName,
            credits,
            price,
            savings,
            order,
            isActive: packCreateActive,
          }),
        });

        const payload = (await response.json()) as
          | { success: true; data: { pack: CreditPackItem } }
          | { success: false; error?: { message?: string } };
        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Impossible de créer le pack." : payload.error?.message);
        }

        setGlobalMessage(`Pack créé: ${payload.data.pack.name} (${payload.data.pack.id}).`);
        setPackCreateId("");
        setPackCreateName("");
        setPackCreateCredits("5");
        setPackCreatePrice("2000");
        setPackCreateSavings("");
        setPackCreateOrder("0");
        setPackCreateActive(true);
        await packsQuery.refetch();
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Impossible de créer ce pack.");
      } finally {
        setIsCreatingPack(false);
      }
    },
    [
      packCreateActive,
      packCreateCredits,
      packCreateId,
      packCreateName,
      packCreateOrder,
      packCreatePrice,
      packCreateSavings,
      packsQuery,
    ],
  );

  const updatePack = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setGlobalError(null);
      setGlobalMessage(null);

      if (!packEditTargetId.trim()) {
        setGlobalError("Sélectionne un pack à modifier.");
        return;
      }

      const patch: Record<string, unknown> = {};
      if (packEditName.trim()) patch.name = packEditName.trim();
      if (packEditCredits.trim()) patch.credits = Number(packEditCredits.trim());
      if (packEditPrice.trim()) patch.price = Number(packEditPrice.trim());
      if (packEditSavings.trim()) patch.savings = Number(packEditSavings.trim());
      if (packEditOrder.trim()) patch.order = Number(packEditOrder.trim());
      if (packEditActive !== "unchanged") patch.isActive = packEditActive === "true";

      if (Object.keys(patch).length === 0) {
        setGlobalError("Aucune modification à appliquer.");
        return;
      }

      setIsUpdatingPack(true);
      try {
        const response = await fetch(`/api/admin/v1/credits/packs/${encodeURIComponent(packEditTargetId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(patch),
        });

        const payload = (await response.json()) as
          | { success: true; data: { pack: CreditPackItem } }
          | { success: false; error?: { message?: string } };
        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Impossible de mettre à jour ce pack." : payload.error?.message);
        }

        setGlobalMessage(`Pack mis à jour: ${payload.data.pack.name} (${payload.data.pack.id}).`);
        setPackEditName("");
        setPackEditCredits("");
        setPackEditPrice("");
        setPackEditSavings("");
        setPackEditOrder("");
        setPackEditActive("unchanged");
        await packsQuery.refetch();
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Impossible de mettre à jour ce pack.");
      } finally {
        setIsUpdatingPack(false);
      }
    },
    [
      packEditActive,
      packEditCredits,
      packEditName,
      packEditOrder,
      packEditPrice,
      packEditSavings,
      packEditTargetId,
      packsQuery,
    ],
  );

  const deletePack = useCallback(
    async (packId: string) => {
      setGlobalError(null);
      setGlobalMessage(null);
      setIsDeletingPackId(packId);

      try {
        const response = await fetch(`/api/admin/v1/credits/packs/${encodeURIComponent(packId)}`, {
          method: "DELETE",
        });

        const payload = (await response.json()) as
          | { success: true; data: { pack: CreditPackItem } }
          | { success: false; error?: { message?: string } };
        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Impossible de supprimer ce pack." : payload.error?.message);
        }

        setGlobalMessage(`Pack supprimé: ${payload.data.pack.name} (${payload.data.pack.id}).`);
        if (packEditTargetId === packId) {
          setPackEditTargetId("");
        }
        await packsQuery.refetch();
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Impossible de supprimer ce pack.");
      } finally {
        setIsDeletingPackId(null);
      }
    },
    [packEditTargetId, packsQuery],
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
          body: JSON.stringify({ status, decisionNote: refundDecisionNote.trim() || undefined }),
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
    [refundDecisionNote, refundsQuery],
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
            disabled={
              walletsQuery.isFetching ||
              transactionsQuery.isFetching ||
              refundsQuery.isFetching ||
              packsQuery.isFetching ||
              auditLogsQuery.isFetching
            }
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

      <div className="grid gap-4 md:grid-cols-4">
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

        <Card className="rounded-2xl border-border/80">
          <CardHeader className="pb-2 text-sm font-medium text-muted-foreground">
            Packs actifs
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatNumber((packsQuery.data?.packs ?? []).filter((pack) => pack.isActive).length)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Total packs ({formatNumber(packsQuery.data?.count ?? 0)})
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
        <CardHeader className="pb-2 text-base font-semibold">Packs de crédits</CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-2 md:grid-cols-8" onSubmit={createPack}>
            <Input
              value={packCreateId}
              onChange={(event) => setPackCreateId(event.target.value)}
              placeholder="id (starter, premium...)"
              disabled={!canManagePacks || isCreatingPack}
            />
            <Input
              value={packCreateName}
              onChange={(event) => setPackCreateName(event.target.value)}
              placeholder="Nom"
              disabled={!canManagePacks || isCreatingPack}
            />
            <Input
              type="number"
              min={1}
              value={packCreateCredits}
              onChange={(event) => setPackCreateCredits(event.target.value)}
              placeholder="Crédits"
              disabled={!canManagePacks || isCreatingPack}
            />
            <Input
              type="number"
              min={0}
              value={packCreatePrice}
              onChange={(event) => setPackCreatePrice(event.target.value)}
              placeholder="Prix XAF"
              disabled={!canManagePacks || isCreatingPack}
            />
            <Input
              type="number"
              min={0}
              max={99.99}
              step="0.01"
              value={packCreateSavings}
              onChange={(event) => setPackCreateSavings(event.target.value)}
              placeholder="Savings %"
              disabled={!canManagePacks || isCreatingPack}
            />
            <Input
              type="number"
              min={0}
              value={packCreateOrder}
              onChange={(event) => setPackCreateOrder(event.target.value)}
              placeholder="Order"
              disabled={!canManagePacks || isCreatingPack}
            />
            <label className="flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm">
              <input
                type="checkbox"
                checked={packCreateActive}
                onChange={(event) => setPackCreateActive(event.target.checked)}
                disabled={!canManagePacks || isCreatingPack}
              />
              Actif
            </label>
            <Button type="submit" disabled={!canManagePacks || isCreatingPack}>
              {isCreatingPack ? "Création..." : "Créer"}
            </Button>
          </form>

          <form className="grid gap-2 md:grid-cols-8" onSubmit={updatePack}>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={packEditTargetId}
              onChange={(event) => setPackEditTargetId(event.target.value)}
              disabled={!canManagePacks || isUpdatingPack}
            >
              <option value="">Pack à modifier</option>
              {(packsQuery.data?.packs ?? []).map((pack) => (
                <option key={pack.id} value={pack.id}>
                  {pack.id} - {pack.name}
                </option>
              ))}
            </select>
            <Input
              value={packEditName}
              onChange={(event) => setPackEditName(event.target.value)}
              placeholder="Nouveau nom (optionnel)"
              disabled={!canManagePacks || isUpdatingPack}
            />
            <Input
              value={packEditCredits}
              onChange={(event) => setPackEditCredits(event.target.value)}
              placeholder="Crédits (optionnel)"
              type="number"
              min={1}
              disabled={!canManagePacks || isUpdatingPack}
            />
            <Input
              value={packEditPrice}
              onChange={(event) => setPackEditPrice(event.target.value)}
              placeholder="Prix XAF (optionnel)"
              type="number"
              min={0}
              disabled={!canManagePacks || isUpdatingPack}
            />
            <Input
              value={packEditSavings}
              onChange={(event) => setPackEditSavings(event.target.value)}
              placeholder="Savings % (optionnel)"
              type="number"
              min={0}
              max={99.99}
              step="0.01"
              disabled={!canManagePacks || isUpdatingPack}
            />
            <Input
              value={packEditOrder}
              onChange={(event) => setPackEditOrder(event.target.value)}
              placeholder="Order (optionnel)"
              type="number"
              min={0}
              disabled={!canManagePacks || isUpdatingPack}
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={packEditActive}
              onChange={(event) => setPackEditActive(event.target.value as typeof packEditActive)}
              disabled={!canManagePacks || isUpdatingPack}
            >
              <option value="unchanged">Actif inchangé</option>
              <option value="true">Activer</option>
              <option value="false">Désactiver</option>
            </select>
            <Button type="submit" variant="outline" disabled={!canManagePacks || isUpdatingPack}>
              {isUpdatingPack ? "Mise à jour..." : "Mettre à jour"}
            </Button>
          </form>

          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">ID</th>
                  <th className="px-3 py-2 font-medium">Nom</th>
                  <th className="px-3 py-2 font-medium">Crédits</th>
                  <th className="px-3 py-2 font-medium">Prix</th>
                  <th className="px-3 py-2 font-medium">Savings</th>
                  <th className="px-3 py-2 font-medium">Actif</th>
                  <th className="px-3 py-2 font-medium">Order</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(packsQuery.data?.packs ?? []).map((pack) => (
                  <tr key={pack.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{pack.id}</td>
                    <td className="px-3 py-2">{pack.name}</td>
                    <td className="px-3 py-2">{formatNumber(pack.credits)}</td>
                    <td className="px-3 py-2">{formatMoneyXaf(pack.price)}</td>
                    <td className="px-3 py-2">{pack.savings == null ? "N/A" : `${pack.savings}%`}</td>
                    <td className="px-3 py-2">{pack.isActive ? "Oui" : "Non"}</td>
                    <td className="px-3 py-2">{pack.order}</td>
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8"
                        disabled={!canManagePacks || isDeletingPackId === pack.id}
                        onClick={() => deletePack(pack.id)}
                      >
                        {isDeletingPackId === pack.id ? "Suppression..." : "Supprimer"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {packsQuery.data && packsQuery.data.packs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                      Aucun pack configuré.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {!canManagePacks ? (
            <p className="text-xs text-muted-foreground">
              Permission requise: <code>credits.pack_manage</code>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80">
        <CardHeader className="flex flex-row items-center justify-between pb-2 text-base font-semibold">
          <span>Portefeuilles crédits</span>
          <Button
            type="button"
            variant="outline"
            className="h-8"
            onClick={() => {
              const params = new URLSearchParams();
              if (walletQueryApplied) params.set("query", walletQueryApplied);
              params.set("role", walletRole);
              params.set("status", walletStatus);
              params.set("presence", walletPresence);
              exportCsv(`/api/admin/v1/credits/wallets/export?${params.toString()}`);
            }}
            disabled={!canReadCredits}
          >
            Export CSV
          </Button>
        </CardHeader>
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
        <CardHeader className="flex flex-row items-center justify-between pb-2 text-base font-semibold">
          <span>Transactions crédits</span>
          <Button
            type="button"
            variant="outline"
            className="h-8"
            onClick={() => {
              const params = new URLSearchParams();
              if (txQueryApplied) params.set("query", txQueryApplied);
              if (txUidApplied) params.set("uid", txUidApplied);
              params.set("type", txType);
              params.set("status", txStatus);
              if (txCreatedAfter) params.set("createdAfter", txCreatedAfter);
              if (txCreatedBefore) params.set("createdBefore", txCreatedBefore);
              exportCsv(`/api/admin/v1/transactions/export?${params.toString()}`);
            }}
            disabled={!canReadTransactions}
          >
            Export CSV
          </Button>
        </CardHeader>
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
        <CardHeader className="flex flex-row items-center justify-between pb-2 text-base font-semibold">
          <span>Remboursements</span>
          <Button
            type="button"
            variant="outline"
            className="h-8"
            onClick={() => {
              const params = new URLSearchParams();
              if (refundQueryApplied) params.set("query", refundQueryApplied);
              params.set("status", refundStatus);
              exportCsv(`/api/admin/v1/refunds/export?${params.toString()}`);
            }}
            disabled={!canReadRefunds}
          >
            Export CSV
          </Button>
        </CardHeader>
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

          <div className="grid gap-2 md:grid-cols-2">
            <Input
              value={refundDecisionNote}
              onChange={(event) => setRefundDecisionNote(event.target.value)}
              placeholder="Note de décision (requise pour gros montants)"
              disabled={!canApproveRefunds}
            />
            <p className="text-xs text-muted-foreground">
              Si le montant dépasse le seuil, une note devient obligatoire et peut exiger un super admin.
            </p>
          </div>

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

      <Card className="rounded-2xl border-border/80">
        <CardHeader className="pb-2 text-base font-semibold">Journal d'audit finance</CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-2 md:grid-cols-5" onSubmit={applyAuditFilters}>
            <Input
              value={auditActionPrefix}
              onChange={(event) => setAuditActionPrefix(event.target.value)}
              placeholder="Préfixe action (credits., refunds.)"
              disabled={!canReadAudit}
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={auditStatus}
              onChange={(event) => setAuditStatus(event.target.value as typeof auditStatus)}
              disabled={!canReadAudit}
            >
              <option value="all">Statut: Tous</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="denied">Denied</option>
            </select>
            <Input
              value={auditQueryDraft}
              onChange={(event) => setAuditQueryDraft(event.target.value)}
              placeholder="Recherche action, actorId, ressource..."
              disabled={!canReadAudit}
            />
            <Button type="submit" variant="outline" disabled={!canReadAudit}>
              Appliquer
            </Button>
            <Button type="button" variant="ghost" onClick={resetAuditFilters} disabled={!canReadAudit}>
              Réinitialiser
            </Button>
          </form>

          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Actor</th>
                  <th className="px-3 py-2 font-medium">Ressource</th>
                  <th className="px-3 py-2 font-medium">Statut</th>
                  <th className="px-3 py-2 font-medium">Correlation</th>
                </tr>
              </thead>
              <tbody>
                {(auditLogsQuery.data?.logs ?? []).map((log) => (
                  <tr key={log.id} className="border-t align-top">
                    <td className="px-3 py-2">{toDateLabel(log.createdAt)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{log.action}</td>
                    <td className="px-3 py-2">
                      <p className="font-mono text-xs">{log.actorId ?? "N/A"}</p>
                      <p className="text-xs text-muted-foreground">{log.actorRoles.join(", ") || "N/A"}</p>
                    </td>
                    <td className="px-3 py-2">
                      {log.resource ?? "N/A"}
                      {log.resourceId ? <span className="text-xs text-muted-foreground"> ({log.resourceId})</span> : null}
                    </td>
                    <td className="px-3 py-2">{log.status ?? "N/A"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{log.correlationId ?? "N/A"}</td>
                  </tr>
                ))}
                {auditLogsQuery.data && auditLogsQuery.data.logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                      Aucun log trouvé.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{formatNumber(auditLogsQuery.data?.count ?? 0)} ligne(s)</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (auditCursorHistory.length === 0) return;
                  const previous = auditCursorHistory[auditCursorHistory.length - 1] ?? "";
                  setAuditCursorHistory((old) => old.slice(0, -1));
                  setAuditCursor(previous || null);
                }}
                disabled={auditCursorHistory.length === 0}
              >
                Précédent
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const nextCursor = auditLogsQuery.data?.page.nextCursor;
                  if (!nextCursor) return;
                  setAuditCursorHistory((old) => [...old, auditCursor ?? ""]);
                  setAuditCursor(nextCursor);
                }}
                disabled={!auditLogsQuery.data?.page.hasMore}
              >
                Suivant
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {(!canReadCredits || !canReadTransactions || !canReadRefunds || !canReadAudit) && permissions.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Certaines sections ne sont pas visibles avec vos permissions actuelles.
        </div>
      ) : null}
    </div>
  );
}
