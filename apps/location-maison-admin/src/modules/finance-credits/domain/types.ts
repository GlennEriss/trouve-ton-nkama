export type FinanceWalletRoleFilter = "all" | "user" | "announcer" | "admin";
export type FinanceWalletStatusFilter = "all" | "active" | "suspended" | "archived";
export type FinanceWalletPresenceFilter = "all" | "online" | "offline";

export type FinanceWalletItem = {
  uid: string;
  docId: string;
  fullName: string;
  email: string | null;
  roles: string[];
  credits: number;
  state: string | null;
  isSuspended: boolean;
  presenceStatus: "online" | "offline";
  lastSeenAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ListFinanceWalletsInput = {
  limit: number;
  cursor?: string | null;
  query?: string;
  role?: FinanceWalletRoleFilter;
  status?: FinanceWalletStatusFilter;
  presence?: FinanceWalletPresenceFilter;
};

export type ListFinanceWalletsResult = {
  wallets: FinanceWalletItem[];
  count: number;
  totalCount: number | null;
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
  filters: {
    query: string;
    role: FinanceWalletRoleFilter;
    status: FinanceWalletStatusFilter;
    presence: FinanceWalletPresenceFilter;
    limit: number;
  };
};

export type FinanceTransactionType = "purchase" | "spend" | "grant" | string;
export type FinanceTransactionStatus = "pending" | "success" | "failed" | "cancelled" | string;
export type FinanceTransactionTypeFilter = "all" | "purchase" | "spend" | "grant";
export type FinanceTransactionStatusFilter =
  | "all"
  | "pending"
  | "success"
  | "failed"
  | "cancelled";

export type FinanceCreditTransaction = {
  id: string;
  uid: string | null;
  type: FinanceTransactionType;
  status: FinanceTransactionStatus;
  credits: number;
  amount: number | null;
  packId: string | null;
  packName: string | null;
  provider: string | null;
  service: string | null;
  description: string | null;
  phoneNumber: string | null;
  propertyId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
};

export type ListFinanceTransactionsInput = {
  limit: number;
  cursor?: string | null;
  query?: string;
  uid?: string | null;
  type?: FinanceTransactionTypeFilter;
  status?: FinanceTransactionStatusFilter;
  createdAfter?: string | null;
  createdBefore?: string | null;
};

export type ListFinanceTransactionsResult = {
  transactions: FinanceCreditTransaction[];
  count: number;
  totalCount: number | null;
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
  filters: {
    query: string;
    uid: string | null;
    type: FinanceTransactionTypeFilter;
    status: FinanceTransactionStatusFilter;
    createdAfter: string | null;
    createdBefore: string | null;
    limit: number;
  };
};

export type FinanceRefundStatus = "pending" | "approved" | "rejected" | "failed" | "success" | string;
export type FinanceRefundStatusFilter =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "failed"
  | "success";

export type FinanceRefundItem = {
  id: string;
  phoneNumber: string | null;
  amount: number | null;
  status: FinanceRefundStatus;
  reason: string | null;
  createdAt: string | null;
  refundedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  decisionNote: string | null;
};

export type ListFinanceRefundsInput = {
  limit: number;
  cursor?: string | null;
  query?: string;
  status?: FinanceRefundStatusFilter;
};

export type ListFinanceRefundsResult = {
  refunds: FinanceRefundItem[];
  count: number;
  totalCount: number | null;
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
  filters: {
    query: string;
    status: FinanceRefundStatusFilter;
    limit: number;
  };
};

export type GrantCreditsInput = {
  uid: string;
  credits: number;
  reason: string;
  actorUid: string;
  actorEmail: string;
  idempotencyKey?: string | null;
};

export type GrantCreditsResult = {
  transactionId: string;
  uid: string;
  creditsGranted: number;
  previousCredits: number;
  currentCredits: number;
  reason: string;
  grantedAt: string;
  replayed: boolean;
};

export type ReviewRefundInput = {
  refundId: string;
  nextStatus: "approved" | "rejected";
  actorUid: string;
  decisionNote?: string;
};

export type ReviewRefundResult = {
  refundId: string;
  previousStatus: string;
  nextStatus: "approved" | "rejected";
  reviewedAt: string;
};

export type FinanceCreditPack = {
  id: string;
  name: string;
  credits: number;
  price: number;
  savings: number | null;
  isActive: boolean;
  order: number;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
};

export type ListFinanceCreditPacksResult = {
  packs: FinanceCreditPack[];
  count: number;
};

export type CreateFinanceCreditPackInput = {
  id: string;
  name: string;
  credits: number;
  price: number;
  savings?: number | null;
  isActive?: boolean;
  order?: number;
  actorUid: string;
};

export type UpdateFinanceCreditPackInput = {
  packId: string;
  patch: {
    name?: string;
    credits?: number;
    price?: number;
    savings?: number | null;
    isActive?: boolean;
    order?: number;
  };
  actorUid: string;
};

export type DeleteFinanceCreditPackInput = {
  packId: string;
};

export type FinanceAuditLogItem = {
  id: string;
  actorId: string | null;
  actorRoles: string[];
  action: string;
  resource: string | null;
  resourceId: string | null;
  status: string | null;
  correlationId: string | null;
  createdAt: string | null;
  diff: Record<string, unknown> | null;
  details: Record<string, unknown> | null;
};

export type ListFinanceAuditLogsInput = {
  limit: number;
  cursor?: string | null;
  actionPrefix?: string | null;
  status?: "all" | "success" | "failed" | "denied";
  actorId?: string | null;
  query?: string | null;
};

export type ListFinanceAuditLogsResult = {
  logs: FinanceAuditLogItem[];
  count: number;
  page: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
  filters: {
    actionPrefix: string | null;
    status: "all" | "success" | "failed" | "denied";
    actorId: string | null;
    query: string | null;
    limit: number;
  };
};
