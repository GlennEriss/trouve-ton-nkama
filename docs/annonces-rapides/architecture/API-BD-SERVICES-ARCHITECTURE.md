# Contrats API et services cibles

## Routes proposées

| Route | Autorisation et résultat |
| --- | --- |
| `POST /api/quick-listings/initiate` | Annonceur authentifié, texte/localisation/contact + réseau/numéro payeur + clé idempotence. Réserve puis initie ; montant et ownerUid imposés serveur |
| `GET /api/quick-listings/payments/{id}/status` | Propriétaire uniquement ; retourne état, listingId et message sûr, jamais token ni téléphone payeur |
| `GET /api/quick-listings` | DTO public, 20 éléments, limite plafond 50, curseur opaque validé, ville optionnelle |
| `GET /api/quick-listings/{id}` | Public si éligible ; sinon propriétaire autorisé ; cache privé/no-store pour variante propriétaire |
| Routes admin sous convention existante | Liste bornée, approbation/rejet, audit actorUid/date ; contrôle admin serveur |

401 non connecté, 403 rôle interdit, 404 objet absent/non accessible, 400 payload invalide, 409 conflit d'idempotence, 429 limite, 502 refus technique fournisseur. Une panne de polling n'est pas un échec financier.

## Parcours

1. Étape texte puis localisation/contact avec React Hook Form ; retour entre étapes sans perte de saisie. Avertissements visibles avant paiement, aucune case commerciale inventée avant validation des conditions.
2. `resolveAuthenticatedUid(request)` puis lecture du rôle autorisé depuis la source serveur existante. Vérification d'origine pour POST avec cookie, mêmes conventions CSRF que le projet. Ne pas accepter `ownerUid`, prix ou statut du client.
3. Transaction Firestore : clé UID/idempotence, payload immuable, réservation unique et quota concurrent par UID/payeur (seuil configurable à tester). Aucun fetch fournisseur à l'intérieur d'une transaction Firestore rejouable.
4. Appel Function avec authentification serveur telle que définie dans la vue d'ensemble. La Function recharge le paiement, acquiert le droit d'initier et réutilise `getMyPayGaConfig`, normalisation et payload MyPayGa. Même identifiant stable ; ne pas supposer une garantie d'idempotence du prestataire non vérifiée.
5. Timeout ou crash après envoi : marquer résultat indéterminé et attendre callback/rapprochement. Aucun second appel de débit automatique. Un état indéterminé peut nécessiter traitement admin si aucune API de vérification fournisseur n'est confirmée.
6. Callback : `buildCallbackPayload`, HMAC SHA-512 via `computeCallbackHash`, `timingSafeEqual`, vérifier champs signés, identifiant, montant présent/fini/égal à 200 et cohérence du token enregistré quand disponible. Ne pas baser un succès sur un champ non couvert par la signature. Échec de vérification : aucune transition financière.
7. Transaction unique : relire existence + statut paiement + annonce ; confirmer paiement et mettre PENDING une fois, sans écraser une décision admin ou réactiver un objet archivé. Callback tardif d'échec ne dégrade jamais confirmed.
8. Modale `PaymentStatusModal` avec message métier explicite. Succès financier → confirmation « en attente de modération », pas « publiée ». Fermer ne supprime ni n'annule l'opération. Reprise après rechargement via référence d'opération liée au compte.
9. Admin approuve/rejette selon les conventions existantes. Ajouter file dédiée et raccordement du mécanisme d'e-mail existant pour ces documents ; ne pas prétendre que le trigger properties les couvre déjà.

## Réutilisation sans régression

Pas d'extension destructive du contrat de demande de recherche. Extraire seulement les utilitaires fournisseur réellement communs si nécessaire, avec tests inchangés des demandes/cadeaux/crédits. Ne pas modifier leurs tarifs. Le hook spécialisé rapide réutilise les primitives de suivi, pas les budgets/boost/anonymat du hook demandes.

## Tests avant activation

- Domaine : prix fixe, limites texte, géographie cohérente, téléphone, transitions, rejet sans perte de paiement.
- API : NextAuth et Firebase, usurpation UID, non-annonceur, CSRF, accès paiement tiers, payload inconnu, quotas concurrents.
- Paiement : double clic simultané, même clé/données différentes, deux callbacks concurrents, mauvais HMAC, montant absent/zéro/négatif/différent, succès puis échec, refus puis succès signé, crash et timeout, document manquant, callback après archivage.
- Rules émulateur : privé impayé/pending/rejeté/archivé ; public seulement avec trois conditions ; aucune écriture client ; aucune lecture paiement tiers.
- UI : deux étapes, retour, erreur, fermeture/reprise, contact, avertissements, responsive, Voir tout, filtre sans budget mensonger, OG textuelle sans photo fictive.
- Régression : demandes de recherche, cartes classiques, cadeaux, recharge, alertes admin. E2E dev borné et nettoyé selon le périmètre v1.

Logs : operationId/listingId, état, durée, code d'erreur ; jamais clé API, secret callback, signature, token payeur ni corps brut fournisseur. Mesurer latence et paiements indéterminés avant généralisation.
