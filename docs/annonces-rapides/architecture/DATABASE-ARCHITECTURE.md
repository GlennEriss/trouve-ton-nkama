# Données cibles

## `quick_listings/{id}`

`id`, `ownerUid`, `description`, localisation canonique existante (IDs + libellés province/ville/quartier), `contactPhone` normalisé, `paymentStatus`, `moderationStatus`, `state`, `createdAt`, `updatedAt`, `publishedAt` nullable. Pas de `images`, prix, surface ou type fictif. Texte brut échappé au rendu, aucun HTML interprété. Bornes proposées : texte 10–3 000 caractères, validation identique client/serveur ; ne pas tronquer silencieusement.

La structure géographique exacte doit reprendre les IDs des combobox existantes après inspection de leurs adaptateurs ; vérifier côté serveur la cohérence quartier → ville → province. Ne pas créer une deuxième taxonomie. Le quartier est demandé dans le parcours ; absence de référentiel à traiter explicitement, pas de valeur fictive.

Les notes/motifs privés de modération vivent dans un document privé, exposé seulement au propriétaire/admin par DTO. Firestore ne masque pas des champs lors d'une lecture de document : aucun téléphone payeur, token, signature, ticket ou raison interne dans ce document public.

## `quick_listing_payments/{paymentId}` (privé)

`listingId`, `ownerUid`, `idempotencyKeyHash`, `payloadHash`, `amountXaf: 200`, `currency: XAF`, réseau et téléphone payeur, identifiant fournisseur/token, `status`, timestamps, preuve de callback vérifié, code d'erreur maîtrisé. Document privé de coordination pour ticket/expiration/bail si nécessaire. Pas d'écriture client.

Idempotence par UID + clé client aléatoire : même clé et même payload retourne la même opération ; payload différent → 409. Réservation du paiement et du contenu atomique. Gel du contenu pendant paiement en cours. Un utilisateur ne peut pas réutiliser la clé d'un autre.

## Transitions

| Événement | Paiement | Modération | Visibilité |
| --- | --- | --- | --- |
| Réservation | pending_confirmation | null | Privé |
| Timeout transport / navigateur | pending_confirmation, résultat indéterminé | null | Privé |
| Refus fournisseur vérifié | failed | null | Privé |
| Succès signé, montant strict 200 | confirmed | PENDING | Privé |
| Approbation admin | confirmed | APPROVED | Public si IN_PROGRESS |
| Rejet admin | confirmed | REJECTED | Privé |
| Archivage | inchangé | inchangé | Privé |

Succès rejoué : aucune mutation de modération. Échec reçu après succès : journaliser sans rétrograder. Succès tardif après échec : traiter une seule fois si la même opération est authentifiée, pas un nouveau paiement. Suppression/archivage pendant paiement : pas de résurrection ; conserver preuve pour rapprochement. Une reprise financière après résultat indéterminé exige résolution de l'opération précédente.

## Sécurité

Lecture publique seulement si `paymentStatus == confirmed && moderationStatus == APPROVED && state == IN_PROGRESS`. Même prédicat dans Rules, APIs, catalogue, détail et OG. Lecture propriétaire après identité vérifiée ; opérations sensibles via serveur. Client interdit de changer paiement, propriétaire, modération ou publier directement. Admin contrôlé par le mécanisme de rôles existant, pas par une valeur du body.

## Index et rétention

Index cible public : paymentStatus/moderationStatus/state/publishedAt DESC + identifiant comme départage du curseur. Variante avec cityId pour filtre ville. Index propriétaire : ownerUid/createdAt DESC ; modération : paymentStatus/moderationStatus/createdAt ASC. Vérifier les requêtes réellement codées avant déploiement des index.

Pas de TTL sur les annonces rapides : aucune expiration automatique, suppression réservée à l'administrateur. Un état privé de modération ne signifie pas expiration. Aucun archivage automatique ou bouton de suppression propriétaire à introduire implicitement.

Pas de TTL sur les paiements en attente ou confirmés. Rétention financière et gestion des brouillons à définir séparément ; la suppression d'une annonce ne supprime pas sa preuve de paiement. La facturation transversale est prévue au lot 12. Pas de modèle analytique supplémentaire au MVP : logs structurés limités aux identifiants techniques et états, sans données de paiement sensibles.
