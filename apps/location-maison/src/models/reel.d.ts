/**
 * @module reel
 */
import { ICreation } from "./creation";
import type { ModerationStatus } from "./annonce";

export type ReelProcessingStatus = 'uploading' | 'processing' | 'ready' | 'failed';

export type Reel = ICreation & {
    // Optionnel : un réel peut être créé sans annonce existante (visiteur sans compte/sans
    // annonce, voir CreateOrphanReelClient) puis rattaché plus tard via attachReelToProperty.
    propertyId?: string | null;
    createdBy: string;
    // Numéro à contacter pour ce réel, indépendant d'une éventuelle annonce liée (un réel peut
    // exister sans annonce, voir propertyId). Optionnel : si absent, le feed retombe sur le
    // contact de l'annonce liée puis, en dernier recours, le numéro de profil du créateur.
    contact?: string;
    // Texte libre affiché sur le réel dans le feed. Facultatif pour garder une création rapide.
    description?: string;

    processingStatus: ReelProcessingStatus;
    processingError?: string;
    rawVideoPath: string;
    // Découpe demandée par l'annonceur à l'envoi (secondes, relatives au fichier brut) — lue
    // une seule fois par transcodeReelVideo puis sans effet ultérieur (le montage ne s'applique
    // qu'au transcodage initial, pas à une vidéo déjà "ready").
    trimStartSeconds?: number;
    trimEndSeconds?: number;
    // Son coupé à l'envoi (WhatsApp-like) — répercuté dans l'encodage final (-an), pas
    // seulement dans l'aperçu client.
    muted?: boolean;

    videoUrl?: string;
    videoPath?: string;
    thumbnailUrl?: string;
    thumbnailPath?: string;
    durationSeconds?: number;

    moderationStatus: ModerationStatus;
    rejectionReason?: string;
    moderationReviewedAt?: import("firebase/firestore").Timestamp;
    moderationReviewedBy?: string;

    viewCount: number;
    giftCount: number;
    giftTotalAmount: number;
}
