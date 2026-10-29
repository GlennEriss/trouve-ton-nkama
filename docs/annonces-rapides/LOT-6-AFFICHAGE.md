# Lot 6 — affichage sans photos

Implémentation locale, 28 octobre 2026. Aucun paiement, aucune annonce de production créée, aucun déploiement.

## Livré

Dans `apps/location-maison/src/` :

- `components/quick-listings/QuickListingSafetyNotice.tsx` : avertissements sur visite, dépôt anticipé, identité, bail et justificatif. Aucune garantie de fiabilité des offres avec photos.
- `QuickListingCard.tsx` : carte textuelle Sans photo, localisation, extrait et lien Lire l'annonce. Pas d'image fictive ni de prix extrait automatiquement.
- `QuickListingDetail.tsx` : description complète en texte échappé avec sauts de ligne, précautions avant contacts Appeler/WhatsApp ; composants et styles cohérents avec les demandes existantes.
- `features/quick-listings/public-listing.ts` : projection explicite des champs publics, validation des données, paiement confirmé + APPROVED + IN_PROGRESS exigés. Normalisation téléphone existante réutilisée. Aucun critère d'expiration.
- `public-listing.server.ts` : lecture Admin SDK bornée à un document ; projection obligatoire car Admin SDK ne passe pas par les Security Rules. Pas d'endpoint d'écriture ni d'accès propriétaire ajouté dans ce lot.
- `app/(public)/annonces-rapides/[id]/` : fiche dynamique sans cache persistant, états chargement/erreur/introuvable et métadonnées OG/Twitter sans photographie. Les documents non publics ne fournissent ni texte ni contact dans les métadonnées.

Libellés publics de localisation : province/city/neighborhood ; les IDs canoniques seront intégrés au parcours d'écriture sans être exposés inutilement. Le composant de carte reçoit uniquement le DTO public, jamais le document Firestore brut.

## Vérification

5 suites Jest ciblées, 41 tests réussis (23 nouveaux et 18 de non-régression). TypeScript sans erreur. Tests : refus états privés, projection sans secrets, texte HTML non interprété, contacts, page/métadonnées et lecture serveur. Tests avec doubles Firestore, aucune écriture réelle.

Guide UI/UX utilisé pour avertissements accessibles, contrôles 44 px minimum, texte adaptable et thèmes clair/sombre. Rendu visuel navigateur et aperçu effectif WhatsApp/Facebook non vérifiés ; ne pas les déclarer validés.

## Reste et limites

Le raccordement des cartes à l'accueil et au catalogue est le **lot 7**, pas encore livré. Sans document public valide dans `quick_listings`, une fiche retourne indisponible : aucune annonce fictive créée pour la démonstration. Le formulaire et le paiement viennent aux lots suivants. Le partage utilise des métadonnées textuelles ; pas de garantie de rafraîchissement immédiat des caches sociaux.
