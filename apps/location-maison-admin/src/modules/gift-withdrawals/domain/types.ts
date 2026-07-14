export type GiftWithdrawalStatus = "EN_ATTENTE" | "TRAITE" | "REFUSE";
export type GiftNetwork = "AM" | "MM";

/** Forme brute du document Firestore `gift_withdrawals/{id}` — voir apps/location-maison/src/models/gift.d.ts. */
export type GiftWithdrawalRawDoc = {
  announcerUid: string;
  montantXaf: number;
  feeRate: number;
  feeXaf: number;
  netPayoutXaf: number;
  numero: string;
  reseau: GiftNetwork;
  statut: GiftWithdrawalStatus;
  traitePar?: string | null;
  motifRefus?: string | null;
  dateCreation?: unknown;
  dateMiseAJour?: unknown;
};

export type GiftWithdrawalListItem = {
  id: string;
  announcerUid: string;
  montantXaf: number;
  feeXaf: number;
  netPayoutXaf: number;
  numero: string;
  reseau: GiftNetwork;
  statut: GiftWithdrawalStatus;
  traitePar: string | null;
  motifRefus: string | null;
  dateCreation: string | null;
  dateMiseAJour: string | null;
};
