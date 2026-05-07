import type {
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
  ListFinanceTransactionsInput,
  ListFinanceTransactionsResult,
  ListFinanceWalletsInput,
  ListFinanceWalletsResult,
  ReviewRefundInput,
} from "@/modules/finance-credits/domain/types";
import {
  grantCreditsAndCreateTransaction,
  listCreditTransactionsRawPage,
  listRefundsRawPage,
  listWalletUsersRawPage,
  reviewRefund,
} from "@/modules/finance-credits/infrastructure/finance-credits.repository";
import {
  claimFinanceGrantIdempotency,
  completeFinanceGrantIdempotency,
  failFinanceGrantIdempotency,
} from "@/modules/finance-credits/infrastructure/finance-idempotency.repository";

const MAX_SCAN_PAGES = 60;
const MIN_SCAN_LIMIT = 50;
const MAX_SCAN_DOCS = Number(process.env.ADMIN_SCAN_DOCS_LIMIT ?? 10000);

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

export async function reviewFinanceRefund(input: ReviewRefundInput) {
  return reviewRefund(input);
}
