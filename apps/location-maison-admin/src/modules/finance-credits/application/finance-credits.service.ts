import type {
  CreateFinanceCreditPackInput,
  FinanceAuditLogItem,
  FinanceCreditPack,
  FinanceRefundStatusFilter,
  FinanceTransactionStatusFilter,
  FinanceTransactionTypeFilter,
  FinanceWalletItem,
  FinanceWalletPresenceFilter,
  FinanceWalletRoleFilter,
  FinanceWalletStatusFilter,
  GrantCreditsInput,
  GrantCreditsResult,
  ListFinanceRefundsInput,
  ListFinanceRefundsResult,
  ListFinanceAuditLogsInput,
  ListFinanceAuditLogsResult,
  ListFinanceCreditPacksResult,
  ListFinanceTransactionsInput,
  ListFinanceTransactionsResult,
  ListFinanceWalletsInput,
  ListFinanceWalletsResult,
  ReviewRefundInput,
  UpdateFinanceCreditPackInput,
} from "@/modules/finance-credits/domain/types";
import {
  createCreditPack,
  deleteCreditPack,
  getRefundById,
  grantCreditsAndCreateTransaction,
  listCreditPacks,
  listCreditTransactionsRawPage,
  listFinanceAuditLogsRawPage,
  listRefundsRawPage,
  listWalletUsersRawPage,
  reviewRefund,
  updateCreditPack,
} from "@/modules/finance-credits/infrastructure/finance-credits.repository";
import {
  claimFinanceGrantIdempotency,
  completeFinanceGrantIdempotency,
  failFinanceGrantIdempotency,
} from "@/modules/finance-credits/infrastructure/finance-idempotency.repository";

const MAX_SCAN_PAGES = 60;
const MIN_SCAN_LIMIT = 50;
const MAX_SCAN_DOCS = Number(process.env.ADMIN_SCAN_DOCS_LIMIT ?? 10000);
const FINANCE_REFUND_SUPER_ADMIN_THRESHOLD_XAF = Math.max(
  0,
  Number(process.env.FINANCE_REFUND_SUPER_ADMIN_THRESHOLD_XAF ?? 100000),
);
const FINANCE_REFUND_DECISION_NOTE_REQUIRED_THRESHOLD_XAF = Math.max(
  0,
  Number(process.env.FINANCE_REFUND_DECISION_NOTE_REQUIRED_THRESHOLD_XAF ?? 25000),
);
const FINANCE_CREDIT_PACKS_AUTOSEED = String(
  process.env.FINANCE_CREDIT_PACKS_AUTOSEED ?? "true",
).toLowerCase() !== "false";

const DEFAULT_CREDIT_PACKS: Array<{
  id: string;
  name: string;
  credits: number;
  price: number;
  savings: number | null;
  order: number;
}> = [
  {
    id: "starter",
    name: "Starter",
    credits: 5,
    price: 2000,
    savings: null,
    order: 1,
  },
  {
    id: "standard",
    name: "Standard",
    credits: 10,
    price: 3500,
    savings: 12.5,
    order: 2,
  },
  {
    id: "advanced",
    name: "Avancé",
    credits: 25,
    price: 7500,
    savings: 25,
    order: 3,
  },
  {
    id: "premium",
    name: "Premium",
    credits: 50,
    price: 12500,
    savings: 37.5,
    order: 4,
  },
];

function normalizeRoleFilter(value?: string): FinanceWalletRoleFilter {
  if (value === "user" || value === "announcer" || value === "admin") {
    return value;
  }
  return "all";
}

function normalizeStatusFilter(value?: string): FinanceWalletStatusFilter {
  if (value === "active" || value === "suspended" || value === "archived") {
    return value;
  }
  return "all";
}

function normalizePresenceFilter(value?: string): FinanceWalletPresenceFilter {
  if (value === "online" || value === "offline") {
    return value;
  }
  return "all";
}

function normalizeTypeFilter(value?: string): FinanceTransactionTypeFilter {
  if (value === "purchase" || value === "spend" || value === "grant") {
    return value;
  }
  return "all";
}

function normalizeTxStatusFilter(value?: string): FinanceTransactionStatusFilter {
  if (value === "pending" || value === "success" || value === "failed" || value === "cancelled") {
    return value;
  }
  return "all";
}

function normalizeRefundStatusFilter(value?: string): FinanceRefundStatusFilter {
  if (
    value === "pending" ||
    value === "approved" ||
    value === "rejected" ||
    value === "failed" ||
    value === "success"
  ) {
    return value;
  }
  return "all";
}

function hasRole(item: FinanceWalletItem, role: FinanceWalletRoleFilter) {
  if (role === "all") {
    return true;
  }

  const roles = item.roles.map((entry) => entry.toLowerCase());

  if (role === "admin") {
    return roles.includes("admin");
  }

  if (role === "announcer") {
    return roles.includes("announcer");
  }

  return roles.includes("user") || roles.length === 0;
}

function matchesWalletStatus(item: FinanceWalletItem, status: FinanceWalletStatusFilter) {
  if (status === "all") {
    return true;
  }

  if (status === "suspended") {
    return item.isSuspended;
  }

  if (status === "archived") {
    return item.state === "ARCHIVED";
  }

  return item.state !== "ARCHIVED" && !item.isSuspended;
}

function matchesWalletPresence(item: FinanceWalletItem, presence: FinanceWalletPresenceFilter) {
  if (presence === "all") {
    return true;
  }
  return item.presenceStatus === presence;
}

function matchesWalletQuery(item: FinanceWalletItem, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [item.uid, item.fullName, item.email ?? "", item.roles.join(" ")]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function timestampOf(value: string | null | undefined) {
  if (!value) {
    return 0;
  }
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function matchesCreatedAtRange(
  createdAt: string | null,
  createdAfter: string | null,
  createdBefore: string | null,
) {
  const target = timestampOf(createdAt);
  if (!target) {
    return false;
  }

  const lower = timestampOf(createdAfter);
  if (lower && target < lower) {
    return false;
  }

  const upper = timestampOf(createdBefore);
  if (upper && target > upper) {
    return false;
  }

  return true;
}

function safeLower(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function buildGrantFingerprint(input: GrantCreditsInput) {
  return [
    input.uid.trim().toLowerCase(),
    String(input.credits),
    input.reason.trim().toLowerCase(),
    input.actorUid.trim().toLowerCase(),
  ].join("|");
}

function normalizePackId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeFiniteNumber(value: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

function hasActorRole(roles: string[], target: string) {
  return roles.some((role) => role.trim().toLowerCase() === target.toLowerCase());
}

async function ensureDefaultCreditPacksIfNeeded() {
  if (!FINANCE_CREDIT_PACKS_AUTOSEED) {
    return;
  }

  const existing = await listCreditPacks();
  if (existing.length > 0) {
    return;
  }

  for (const pack of DEFAULT_CREDIT_PACKS) {
    try {
      await createCreditPack({
        id: pack.id,
        name: pack.name,
        credits: pack.credits,
        price: pack.price,
        savings: pack.savings,
        isActive: true,
        order: pack.order,
        actorUid: "system",
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code !== "FINANCE_PACK_ALREADY_EXISTS") {
        throw error;
      }
    }
  }
}

export async function listFinanceWallets(input: ListFinanceWalletsInput): Promise<ListFinanceWalletsResult> {
  const safeLimit = Math.max(1, Math.min(200, input.limit || 50));
  const requestedCursor = input.cursor?.trim() || null;
  const query = input.query?.trim().toLowerCase() ?? "";
  const role = normalizeRoleFilter(input.role);
  const status = normalizeStatusFilter(input.status);
  const presence = normalizePresenceFilter(input.presence);
  const scanLimit = Math.max(MIN_SCAN_LIMIT, Math.min(500, safeLimit * 3));

  let cursor = requestedCursor;
  let scanCount = 0;
  let scannedDocs = 0;
  let hasMoreRaw = true;
  let hasMore = false;
  const filtered: ListFinanceWalletsResult["wallets"] = [];

  while (
    filtered.length < safeLimit &&
    hasMoreRaw &&
    scanCount < MAX_SCAN_PAGES &&
    scannedDocs < MAX_SCAN_DOCS
  ) {
    scanCount += 1;

    const page = await listWalletUsersRawPage({
      limit: scanLimit,
      cursor,
    });

    if (page.wallets.length === 0) {
      hasMoreRaw = false;
      break;
    }

    scannedDocs += page.wallets.length;

    for (let index = 0; index < page.wallets.length; index += 1) {
      const wallet = page.wallets[index];
      cursor = wallet.docId;

      const keep =
        matchesWalletQuery(wallet, query) &&
        hasRole(wallet, role) &&
        matchesWalletStatus(wallet, status) &&
        matchesWalletPresence(wallet, presence);

      if (keep) {
        filtered.push(wallet);
      }

      if (filtered.length === safeLimit) {
        hasMore = index < page.wallets.length - 1 || page.hasMore;
        break;
      }
    }

    if (filtered.length === safeLimit) {
      break;
    }

    if (!page.hasMore) {
      hasMoreRaw = false;
      break;
    }
  }

  const scanLimited = hasMoreRaw && filtered.length < safeLimit && scannedDocs >= MAX_SCAN_DOCS;
  if (scanLimited) {
    hasMore = true;
  }

  const totalCreditsOnPage = filtered.reduce((acc, wallet) => acc + wallet.credits, 0);
  const onlineWalletsOnPage = filtered.filter((wallet) => wallet.presenceStatus === "online").length;
  const suspendedWalletsOnPage = filtered.filter((wallet) => wallet.isSuspended).length;

  return {
    wallets: filtered,
    count: filtered.length,
    totalCount: null,
    summary: {
      totalCreditsOnPage,
      totalWalletsOnPage: filtered.length,
      onlineWalletsOnPage,
      suspendedWalletsOnPage,
    },
    page: {
      cursor: requestedCursor,
      nextCursor: hasMore ? cursor : null,
      hasMore,
    },
    filters: {
      query,
      role,
      status,
      presence,
      limit: safeLimit,
    },
  };
}

export async function listFinanceTransactions(
  input: ListFinanceTransactionsInput,
): Promise<ListFinanceTransactionsResult> {
  const safeLimit = Math.max(1, Math.min(200, input.limit || 50));
  const requestedCursor = input.cursor?.trim() || null;
  const query = input.query?.trim().toLowerCase() ?? "";
  const uidFilter = input.uid?.trim() || null;
  const type = normalizeTypeFilter(input.type);
  const status = normalizeTxStatusFilter(input.status);
  const createdAfter = input.createdAfter?.trim() || null;
  const createdBefore = input.createdBefore?.trim() || null;
  const scanLimit = Math.max(MIN_SCAN_LIMIT, Math.min(500, safeLimit * 3));

  let cursor = requestedCursor;
  let scanCount = 0;
  let scannedDocs = 0;
  let hasMoreRaw = true;
  let hasMore = false;
  const filtered: ListFinanceTransactionsResult["transactions"] = [];

  while (
    filtered.length < safeLimit &&
    hasMoreRaw &&
    scanCount < MAX_SCAN_PAGES &&
    scannedDocs < MAX_SCAN_DOCS
  ) {
    scanCount += 1;
    const page = await listCreditTransactionsRawPage({
      limit: scanLimit,
      cursor,
    });

    if (page.transactions.length === 0) {
      hasMoreRaw = false;
      break;
    }

    scannedDocs += page.transactions.length;

    for (let index = 0; index < page.transactions.length; index += 1) {
      const tx = page.transactions[index];
      cursor = tx.id;

      const searchable = [
        tx.id,
        tx.uid ?? "",
        tx.description ?? "",
        tx.packName ?? "",
        tx.provider ?? "",
        tx.service ?? "",
        tx.propertyId ?? "",
        tx.phoneNumber ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery = query ? searchable.includes(query) : true;
      const matchesUid = uidFilter ? tx.uid === uidFilter : true;
      const matchesType = type === "all" ? true : safeLower(tx.type) === type;
      const matchesStatus = status === "all" ? true : safeLower(tx.status) === status;
      const matchesRange = matchesCreatedAtRange(tx.createdAt, createdAfter, createdBefore);

      if (matchesQuery && matchesUid && matchesType && matchesStatus && matchesRange) {
        filtered.push(tx);
      }

      if (filtered.length === safeLimit) {
        hasMore = index < page.transactions.length - 1 || page.hasMore;
        break;
      }
    }

    if (filtered.length === safeLimit) {
      break;
    }

    if (!page.hasMore) {
      hasMoreRaw = false;
      break;
    }
  }

  const scanLimited = hasMoreRaw && filtered.length < safeLimit && scannedDocs >= MAX_SCAN_DOCS;
  if (scanLimited) {
    hasMore = true;
  }

  const totalCreditsDeltaOnPage = filtered.reduce((acc, tx) => acc + tx.credits, 0);
  const totalPurchaseCreditsOnPage = filtered
    .filter((tx) => safeLower(tx.type) === "purchase")
    .reduce((acc, tx) => acc + Math.max(0, tx.credits), 0);
  const totalSpendCreditsOnPage = filtered
    .filter((tx) => safeLower(tx.type) === "spend")
    .reduce((acc, tx) => acc + Math.abs(Math.min(0, tx.credits)), 0);
  const totalGrantCreditsOnPage = filtered
    .filter((tx) => safeLower(tx.type) === "grant")
    .reduce((acc, tx) => acc + Math.max(0, tx.credits), 0);

  return {
    transactions: filtered,
    count: filtered.length,
    totalCount: null,
    summary: {
      totalCreditsDeltaOnPage,
      totalPurchaseCreditsOnPage,
      totalSpendCreditsOnPage,
      totalGrantCreditsOnPage,
    },
    page: {
      cursor: requestedCursor,
      nextCursor: hasMore ? cursor : null,
      hasMore,
    },
    filters: {
      query,
      uid: uidFilter,
      type,
      status,
      createdAfter,
      createdBefore,
      limit: safeLimit,
    },
  };
}

export async function listFinanceRefunds(input: ListFinanceRefundsInput): Promise<ListFinanceRefundsResult> {
  const safeLimit = Math.max(1, Math.min(200, input.limit || 50));
  const requestedCursor = input.cursor?.trim() || null;
  const query = input.query?.trim().toLowerCase() ?? "";
  const status = normalizeRefundStatusFilter(input.status);
  const scanLimit = Math.max(MIN_SCAN_LIMIT, Math.min(500, safeLimit * 3));

  let cursor = requestedCursor;
  let scanCount = 0;
  let scannedDocs = 0;
  let hasMoreRaw = true;
  let hasMore = false;
  const filtered: ListFinanceRefundsResult["refunds"] = [];

  while (
    filtered.length < safeLimit &&
    hasMoreRaw &&
    scanCount < MAX_SCAN_PAGES &&
    scannedDocs < MAX_SCAN_DOCS
  ) {
    scanCount += 1;
    const page = await listRefundsRawPage({
      limit: scanLimit,
      cursor,
    });

    if (page.refunds.length === 0) {
      hasMoreRaw = false;
      break;
    }

    scannedDocs += page.refunds.length;

    for (let index = 0; index < page.refunds.length; index += 1) {
      const refund = page.refunds[index];
      cursor = refund.id;
      const searchable = [refund.id, refund.phoneNumber ?? "", refund.reason ?? ""].join(" ").toLowerCase();
      const matchesQuery = query ? searchable.includes(query) : true;
      const matchesStatus = status === "all" ? true : safeLower(refund.status) === status;

      if (matchesQuery && matchesStatus) {
        filtered.push(refund);
      }

      if (filtered.length === safeLimit) {
        hasMore = index < page.refunds.length - 1 || page.hasMore;
        break;
      }
    }

    if (filtered.length === safeLimit) {
      break;
    }

    if (!page.hasMore) {
      hasMoreRaw = false;
      break;
    }
  }

  const scanLimited = hasMoreRaw && filtered.length < safeLimit && scannedDocs >= MAX_SCAN_DOCS;
  if (scanLimited) {
    hasMore = true;
  }

  const pendingOnPage = filtered.filter((item) => safeLower(item.status) === "pending").length;
  const approvedOnPage = filtered.filter((item) => safeLower(item.status) === "approved").length;
  const rejectedOnPage = filtered.filter((item) => safeLower(item.status) === "rejected").length;

  return {
    refunds: filtered,
    count: filtered.length,
    totalCount: null,
    summary: {
      pendingOnPage,
      approvedOnPage,
      rejectedOnPage,
    },
    page: {
      cursor: requestedCursor,
      nextCursor: hasMore ? cursor : null,
      hasMore,
    },
    filters: {
      query,
      status,
      limit: safeLimit,
    },
  };
}

export async function grantCredits(input: GrantCreditsInput, correlationId: string): Promise<GrantCreditsResult> {
  if (!Number.isFinite(input.credits) || input.credits <= 0) {
    throw new Error("FINANCE_INVALID_CREDITS");
  }

  const normalizedInput: GrantCreditsInput = {
    ...input,
    uid: input.uid.trim(),
    reason: input.reason.trim(),
    actorUid: input.actorUid.trim(),
    actorEmail: input.actorEmail.trim().toLowerCase(),
  };

  if (!normalizedInput.uid) {
    throw new Error("FINANCE_USER_NOT_FOUND");
  }

  if (!normalizedInput.reason) {
    throw new Error("FINANCE_REASON_REQUIRED");
  }

  const idempotencyKey = normalizedInput.idempotencyKey?.trim() || null;

  if (!idempotencyKey) {
    const created = await grantCreditsAndCreateTransaction(normalizedInput);
    return {
      transactionId: created.transactionId,
      uid: normalizedInput.uid,
      creditsGranted: normalizedInput.credits,
      previousCredits: created.previousCredits,
      currentCredits: created.currentCredits,
      reason: normalizedInput.reason,
      grantedAt: created.grantedAt,
      replayed: false,
    };
  }

  const requestFingerprint = buildGrantFingerprint(normalizedInput);
  const claim = await claimFinanceGrantIdempotency(idempotencyKey, requestFingerprint, correlationId);

  if (claim.status === "replay") {
    return claim.summary;
  }

  if (claim.status === "in_progress") {
    throw new Error("FINANCE_IDEMPOTENCY_IN_PROGRESS");
  }

  if (claim.status === "conflict") {
    throw new Error("FINANCE_IDEMPOTENCY_CONFLICT");
  }

  try {
    const created = await grantCreditsAndCreateTransaction(normalizedInput);
    const result: GrantCreditsResult = {
      transactionId: created.transactionId,
      uid: normalizedInput.uid,
      creditsGranted: normalizedInput.credits,
      previousCredits: created.previousCredits,
      currentCredits: created.currentCredits,
      reason: normalizedInput.reason,
      grantedAt: created.grantedAt,
      replayed: false,
    };

    await completeFinanceGrantIdempotency(idempotencyKey, correlationId, result);
    return result;
  } catch (error) {
    const code = error instanceof Error ? error.message : "FINANCE_GRANT_FAILED";
    await failFinanceGrantIdempotency(idempotencyKey, correlationId, code);
    throw error;
  }
}

export async function listFinanceCreditPacks(): Promise<ListFinanceCreditPacksResult> {
  await ensureDefaultCreditPacksIfNeeded();
  const packs = await listCreditPacks();
  return {
    packs,
    count: packs.length,
  };
}

export async function createFinanceCreditPack(input: CreateFinanceCreditPackInput): Promise<FinanceCreditPack> {
  const id = normalizePackId(input.id);
  if (!id) {
    throw new Error("FINANCE_PACK_INVALID_ID");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("FINANCE_PACK_INVALID_NAME");
  }

  const credits = Math.trunc(normalizeFiniteNumber(input.credits, 0));
  if (credits <= 0) {
    throw new Error("FINANCE_PACK_INVALID_CREDITS");
  }

  const price = Math.round(normalizeFiniteNumber(input.price, -1));
  if (price < 0) {
    throw new Error("FINANCE_PACK_INVALID_PRICE");
  }

  const savings =
    typeof input.savings === "number" && Number.isFinite(input.savings)
      ? Math.max(0, Math.min(99.99, input.savings))
      : null;

  const order = typeof input.order === "number" && Number.isFinite(input.order)
    ? Math.max(0, Math.trunc(input.order))
    : 0;

  return createCreditPack({
    ...input,
    id,
    name,
    credits,
    price,
    savings,
    order,
  });
}

export async function updateFinanceCreditPack(input: UpdateFinanceCreditPackInput) {
  const packId = normalizePackId(input.packId);
  if (!packId) {
    throw new Error("FINANCE_PACK_INVALID_ID");
  }

  const patch: UpdateFinanceCreditPackInput["patch"] = {};
  if (typeof input.patch.name === "string") {
    const name = input.patch.name.trim();
    if (!name) {
      throw new Error("FINANCE_PACK_INVALID_NAME");
    }
    patch.name = name;
  }

  if (typeof input.patch.credits === "number") {
    const credits = Math.trunc(normalizeFiniteNumber(input.patch.credits, 0));
    if (credits <= 0) {
      throw new Error("FINANCE_PACK_INVALID_CREDITS");
    }
    patch.credits = credits;
  }

  if (typeof input.patch.price === "number") {
    const price = Math.round(normalizeFiniteNumber(input.patch.price, -1));
    if (price < 0) {
      throw new Error("FINANCE_PACK_INVALID_PRICE");
    }
    patch.price = price;
  }

  if (typeof input.patch.savings === "number" || input.patch.savings === null) {
    const savings =
      input.patch.savings === null
        ? null
        : Math.max(0, Math.min(99.99, normalizeFiniteNumber(input.patch.savings, 0)));
    patch.savings = savings;
  }

  if (typeof input.patch.isActive === "boolean") {
    patch.isActive = input.patch.isActive;
  }

  if (typeof input.patch.order === "number") {
    patch.order = Math.max(0, Math.trunc(normalizeFiniteNumber(input.patch.order, 0)));
  }

  if (Object.keys(patch).length === 0) {
    throw new Error("FINANCE_PACK_EMPTY_PATCH");
  }

  return updateCreditPack({
    packId,
    patch,
    actorUid: input.actorUid,
  });
}

export async function deleteFinanceCreditPack(packId: string) {
  const normalized = normalizePackId(packId);
  if (!normalized) {
    throw new Error("FINANCE_PACK_INVALID_ID");
  }

  return deleteCreditPack({
    packId: normalized,
  });
}

export async function listFinanceAuditLogs(
  input: ListFinanceAuditLogsInput,
): Promise<ListFinanceAuditLogsResult> {
  const safeLimit = Math.max(1, Math.min(200, input.limit || 50));
  const requestedCursor = input.cursor?.trim() || null;
  const actionPrefix = input.actionPrefix?.trim().toLowerCase() || null;
  const status = input.status ?? "all";
  const actorId = input.actorId?.trim() || null;
  const query = input.query?.trim().toLowerCase() || null;
  const scanLimit = Math.max(MIN_SCAN_LIMIT, Math.min(500, safeLimit * 3));

  let cursor = requestedCursor;
  let scanCount = 0;
  let scannedDocs = 0;
  let hasMoreRaw = true;
  let hasMore = false;
  const filtered: FinanceAuditLogItem[] = [];

  while (
    filtered.length < safeLimit &&
    hasMoreRaw &&
    scanCount < MAX_SCAN_PAGES &&
    scannedDocs < MAX_SCAN_DOCS
  ) {
    scanCount += 1;
    const page = await listFinanceAuditLogsRawPage({
      limit: scanLimit,
      cursor,
    });

    if (page.logs.length === 0) {
      hasMoreRaw = false;
      break;
    }

    scannedDocs += page.logs.length;

    for (let index = 0; index < page.logs.length; index += 1) {
      const log = page.logs[index];
      cursor = log.id;

      const matchesAction = actionPrefix ? safeLower(log.action).startsWith(actionPrefix) : true;
      const matchesStatus = status === "all" ? true : safeLower(log.status) === status;
      const matchesActor = actorId ? log.actorId === actorId : true;
      const searchable = [
        log.id,
        log.action,
        log.resource ?? "",
        log.resourceId ?? "",
        log.actorId ?? "",
        log.correlationId ?? "",
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = query ? searchable.includes(query) : true;

      if (matchesAction && matchesStatus && matchesActor && matchesQuery) {
        filtered.push(log);
      }

      if (filtered.length === safeLimit) {
        hasMore = index < page.logs.length - 1 || page.hasMore;
        break;
      }
    }

    if (filtered.length === safeLimit) {
      break;
    }

    if (!page.hasMore) {
      hasMoreRaw = false;
      break;
    }
  }

  const scanLimited = hasMoreRaw && filtered.length < safeLimit && scannedDocs >= MAX_SCAN_DOCS;
  if (scanLimited) {
    hasMore = true;
  }

  return {
    logs: filtered,
    count: filtered.length,
    page: {
      cursor: requestedCursor,
      nextCursor: hasMore ? cursor : null,
      hasMore,
    },
    filters: {
      actionPrefix,
      status,
      actorId,
      query,
      limit: safeLimit,
    },
  };
}

export async function reviewFinanceRefund(
  input: ReviewRefundInput,
  actorRoles: string[],
) {
  const current = await getRefundById(input.refundId);
  if (!current) {
    return null;
  }

  if (safeLower(current.status) !== "pending") {
    throw new Error("FINANCE_REFUND_NOT_PENDING");
  }

  const amount = Math.max(0, current.amount ?? 0);
  const decisionNote = input.decisionNote?.trim() || "";

  if (input.nextStatus === "approved") {
    if (
      FINANCE_REFUND_DECISION_NOTE_REQUIRED_THRESHOLD_XAF > 0 &&
      amount >= FINANCE_REFUND_DECISION_NOTE_REQUIRED_THRESHOLD_XAF &&
      !decisionNote
    ) {
      throw new Error("FINANCE_REFUND_NOTE_REQUIRED");
    }

    if (
      FINANCE_REFUND_SUPER_ADMIN_THRESHOLD_XAF > 0 &&
      amount >= FINANCE_REFUND_SUPER_ADMIN_THRESHOLD_XAF &&
      !hasActorRole(actorRoles, "super_admin")
    ) {
      throw new Error("FINANCE_REFUND_SUPER_ADMIN_REQUIRED");
    }
  }

  return reviewRefund({
    ...input,
    decisionNote,
  });
}
