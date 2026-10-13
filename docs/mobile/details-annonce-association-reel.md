# Mobile — Détails d’annonce et association Réel/Annonce

## Audit initial et matrice de parité

Cette analyse est fondée sur les implémentations réelles suivantes :

- PWA : `AdManagementPage`, `HouseDetails`, `PreviewProperty`, `PreviewPropertyMobile`, `PreviewCategoryListing`, `ContactSection`, `CreateOrphanReelClient`, `SelectPropertyForReelClient`, `/api/property/id` et `/api/reels`.
- Mobile : `MyListingsScreen`, `ListingDetailScreen`, `CreateReelScreen`, `myListings.ts`, `property.ts`, `reels.ts`, `ProfileStack` et `PublishStack`.

| Fonctionnalité | PWA | Mobile avant ce lot | Écart confirmé | Action |
|---|---|---|---|---|
| Voir une annonce | Route propriétaire `/property/[id]`, redirection publique sinon | Natif seulement si publique, Web sinon | Rupture du parcours natif | Fiche propriétaire native dans `ProfileStack` |
| Galerie photos | Carrousel, navigation et agrandissement | Défilement et points uniquement | Agrandissement et compteur absents | Galerie paginée avec compteur et plein écran |
| Informations annonce | Gabarits distincts Immobilier/Mode | Titre, prix, localisation et 3 champs | Champs métier et attributs Mode incomplets | Projection fidèle des champs existants |
| Informations annonceur | Vendeur visible sur la fiche Mode | Non chargé sur mobile | Identité absente | Résumé annonceur natif depuis `users/{uid}` |
| Contact | WhatsApp, appel, contacts additionnels, repli annonce/profil | WhatsApp et appel principaux | Contacts additionnels absents | Tous les contacts stockés sont affichés |
| Réels associés | Aucun bloc de liste de Réels associés sur les fiches PWA auditées | Absent | Aucun écart produit démontré | Ne pas inventer de bloc |
| Ajouter un Réel | Lien vers `/reels/add?propertyId=…` | Message « Bientôt disponible » | Fonction bloquée | Navigation vers l’éditeur natif avec `propertyId` |
| Choisir une annonce | Sélection avant création ou choix dans l’éditeur | Choix manuel dans l’éditeur | Préselection absente | Chargement direct de l’annonce transmise |
| Association Réel/Annonce | Champ `propertyId` dans le Réel | API déjà compatible | Non branché depuis Mes annonces | Réutilisation stricte de `propertyId` |
| Validation | API vérifie token, rôle et propriété | Même API utilisée | Vue mobile ne validait pas la préselection | Lecture propriétaire + validation serveur conservée |
| Publication | Création PENDING/uploading, upload Storage, traitement asynchrone | Déjà implémentée | Retour non contextualisé | Retour vers Mes annonces si entrée depuis une annonce |

## Règles métier confirmées

- Une annonce publique doit être `state == IN_PROGRESS` et `moderationStatus == APPROVED` pour être retournée par `/api/property/id` sans session propriétaire.
- La consultation propriétaire ne change jamais `moderationStatus`.
- Une annonce rejetée peut afficher son `rejectionReason` au propriétaire.
- Une annonce archivée reste consultable par son propriétaire mais affiche son indisponibilité.
- Le Réel utilise le champ existant `propertyId`; aucun nouveau modèle de relation n’est introduit.
- Quand `propertyId` est présent, `/api/reels` dérive la catégorie depuis l’annonce et ignore la catégorie libre du client.
- La création commence avec `processingStatus: uploading` et `moderationStatus: PENDING`.
- La propriété d’une annonce inclut le créateur et le revendicataire `claimedBy`, conformément à la gestion d’annonces et aux règles Firestore.

## Architecture retenue

- Une seule fiche native réutilisable : `ListingDetailScreen`.
- Le mode public continue d’utiliser `/api/property/id`, qui protège la visibilité publique.
- Le mode propriétaire lit directement Firestore avec la session Firebase mobile puis vérifie `createdBy`/`claimedBy` avant rendu.
- Un écran `MyListingDetail` est ajouté au `ProfileStack` afin que le retour restaure naturellement `Mes annonces` et son état monté.
- `CreateReelScreen` reste l’unique éditeur : il reçoit seulement `propertyId`, recharge l’annonce autorisée, préremplit le contact et publie via l’API existante.

## Sécurité et erreurs

- Aucun statut de modération n’est écrit pendant la consultation.
- Une annonce publique non approuvée reste invisible par l’endpoint public.
- Le mode propriétaire refuse une annonce ne correspondant ni à `createdBy`, ni à `claimedBy`.
- Le backend Réels vérifie toujours le token Firebase, le rôle annonceur et la propriété dans une transaction.
- Les états annonce introuvable, accès interdit, réseau, absence d’image et échec de publication ont une sortie visible et récupérable.
- La double soumission reste bloquée par `submittingRef`.

## Implémentation livrée

### Consultation native

- `Mes annonces > Voir` ouvre désormais systématiquement `MyListingDetail` dans le `ProfileStack` ; aucune fiche propriétaire n'est envoyée vers la PWA.
- La même fiche native est utilisée en mode public et propriétaire, mais avec deux sources protégées : endpoint public filtré d'un côté, lecture Firestore authentifiée et contrôle `createdBy`/`claimedBy` de l'autre.
- La galerie prend en charge la pagination, le compteur, le plein écran et l'absence de photo.
- La fiche affiche les champs Immobilier ou les attributs Mode réellement présents, les états actif/archivé, la modération, le motif de rejet propriétaire, la localisation, l'annonceur et les contacts principal/additionnels.
- Le retour natif restaure l'écran `Mes annonces` resté monté, donc son onglet et ses filtres locaux.

### Association Réel/Annonce

- `Ajouter un réel` transmet uniquement `propertyId` à l'éditeur natif existant.
- L'éditeur recharge l'annonce depuis Firestore, vérifie sa propriété, préremplit son contact et verrouille la cohérence de catégorie.
- La publication réutilise `/api/reels` et son champ existant `propertyId`.
- Le backend accepte désormais le propriétaire initial (`createdBy`) ou le propriétaire revendiqué (`claimedBy`), comme les règles Firestore et `Mes annonces`.
- La protection contre la double soumission et le marquage d'échec d'upload restent inchangés.
- Après succès depuis une annonce, la navigation revient vers `Profil > Mes annonces`.

## Validation exécutée

| Contrôle | Résultat |
|---|---|
| Tests mobiles ciblés après dernière modification | 4 suites, 47 tests réussis |
| Tests mobiles complets | 51/52 suites et 364/365 tests au premier passage ; l'unique test `LocationSelect` intermittent a réussi isolément (9/9) |
| Tests API Réels | 1 suite, 31 tests réussis sans couverture globale |
| TypeScript Mobile | Réussi |
| TypeScript PWA | Réussi |
| Intégrité du diff | `git diff --check` réussi |
| Lint | Aucun script lint n'est configuré dans les packages concernés |
| E2E Firebase réel | Réussi sur `location-maison-dev` : une annonce, un Réel associé, relation persistée puis nettoyage vérifié |
| Nettoyage Firebase | 0 annonce, 0 Réel, 0 utilisateur et 0 média résiduel pour l'identifiant du scénario |
| Validation visuelle finale Android | À rejouer : l'émulateur n'était plus connecté à ADB lors de la capture finale |

Le scénario E2E est strictement protégé : projet Firebase DEV imposé, API locale imposée et confirmation explicite requise. Il crée une seule annonce et un seul Réel, puis supprime les documents, l'utilisateur temporaire et les médias dans un bloc de nettoyage final.

## Matrice finale de parité

| Fonctionnalité | PWA | Mobile | Statut |
|---|---|---|---|
| Détails Immobilier | Fiche complète | Fiche native, champs issus du modèle | Conforme fonctionnellement |
| Détails Mode | Attributs dynamiques | Attributs dynamiques natifs | Conforme fonctionnellement |
| Galerie | Navigation et agrandissement | Pagination, compteur et plein écran | Conforme |
| Contact | WhatsApp, appel, contacts additionnels | Même couverture | Conforme |
| Informations annonceur | Identité du vendeur | Résumé `users/{uid}` et avatar | Conforme |
| Annonce non publique | Visible au propriétaire autorisé uniquement | Contrôle Firebase `createdBy`/`claimedBy` | Conforme |
| Ajouter un réel | Entrée contextualisée par `propertyId` | Navigation native contextualisée | Conforme |
| Préselection annonce | Recharge et préremplissage | Recharge, contrôle propriétaire et contact | Conforme |
| Association persistante | Champ `propertyId` | Même champ, vérifié en DEV | Conforme |
| Publication | API, Storage, modération PENDING | Même API et même cycle | Conforme |
| Navigation | Retour après création | Retour vers `Mes annonces` | Conforme |

La conformité visuelle finale reste à confirmer manuellement sur l'émulateur Android reconnecté ; aucune conformité visuelle pixel-perfect n'est déclarée sur la seule base des tests automatisés.
