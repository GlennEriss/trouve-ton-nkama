export type SearchRequestModerationStatus = "PENDING" | "APPROVED" | "REJECTED";
export type SearchRequestPaymentStatus = "pending_confirmation" | "confirmed" | "failed";

/** Forme brute du document Firestore `search_requests/{id}` — voir apps/location-maison/src/models/search-request.d.ts. */
export type SearchRequestRawDoc = {
  typeProperty: string;
  transactionType: "FOR_RENT" | "FOR_SALE";
  province: string;
  city: string;
  neighborhood?: string | null;
  budgetMinXaf: number;
  budgetMaxXaf: number;
  description: string;
  whatsappContact: string;

  paymentStatus: SearchRequestPaymentStatus;
  amountPaidXaf: number;

  boostRequested: boolean;
  boostPaid: boolean;
  boostStartAt?: unknown;
  boostEndAt?: unknown;

  // Null tant que le paiement n'est pas confirmé — seuls les docs 'PENDING'
  // entrent dans la file de modération, voir search-requests.repository.ts.
  moderationStatus: SearchRequestModerationStatus | null;
  rejectionReason?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type SearchRequestListItem = {
  id: string;
  typeProperty: string;
  transactionType: "FOR_RENT" | "FOR_SALE";
  province: string;
  city: string;
  neighborhood: string | null;
  budgetMinXaf: number;
  budgetMaxXaf: number;
  description: string;
  whatsappContact: string;
  paymentStatus: SearchRequestPaymentStatus;
  amountPaidXaf: number;
  boostRequested: boolean;
  boostPaid: boolean;
  boostStartAt: string | null;
  boostEndAt: string | null;
  moderationStatus: SearchRequestModerationStatus | null;
  rejectionReason: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};
