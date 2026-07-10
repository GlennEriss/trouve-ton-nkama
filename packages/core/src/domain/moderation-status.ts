// Statut de modération d'une annonce, partagé entre apps/location-maison (annonceur) et
// apps/location-maison-admin (décision admin) — les deux lisent/écrivent le même champ
// Firestore `moderationStatus` et doivent donc s'accorder sur le même ensemble de valeurs.
// Volontairement non-nullable ici : la nullabilité (ex: doc sans modération) s'exprime au
// site d'appel (`ModerationStatus | null`), pas dans le type canonique.
export type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED";
