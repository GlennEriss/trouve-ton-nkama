# Imports Apify sans photo

## Règle

Dans Dashboard → Apify, « Créer l’annonce » (unitaire ou lot) route les brouillons dont `images` est un tableau vide vers `quick_listings`. Les posts avec photos suivent le parcours classique `properties`. Un échec de téléchargement ou une URL invalide ne déclenche **pas** la conversion. Le filtrage immobilier existant reste inchangé.

La validation administrative est explicite dans l’interface : badge/bouton « Annonce rapide ». Le serveur exige `listings.create` **et** `listings.approve` pour un lot contenant une annonce rapide. Aucun import automatique à la récupération Apify.

## Données et paiement

- Texte de 10 à 3000 caractères, province, ville et téléphone mobile gabonais valides obligatoires. Quartier conservé lorsqu’il est disponible. Aucun prix, type de bien ou GPS obligatoire pour cette branche.
- Pas de téléphone remplacé par celui du compte d’attribution. Les données manquantes doivent être corrigées par l’administrateur.
- `paymentStatus: not_required` : exemption d’import administratif, **pas un paiement confirmé**. Aucun appel MyPayGa, débit ou reçu créé. Le tarif public de 200 FCFA reste inchangé.
- `moderationStatus: APPROVED`, `state: IN_PROGRESS`, `publishedAt` daté après validation par l’administrateur, comme la publication classique Apify existante.
- Annonceur cible, administrateur, motif d’exemption et provenance stockés dans `quick_listing_moderation` (privé). Le document public ne contient que le contenu et les états nécessaires.
- Aucune expiration automatique. Un réel n’est jamais lié à un identifiant d’annonce rapide : il conserve son parcours indépendant.

## Idempotence

Identifiant `apify-<sha256(auteur source + texte source normalisé)>`, indépendant du compte d’attribution et des corrections du brouillon. Une transaction crée ensemble annonce et trace privée. Une relance/concurrence retourne l’identifiant existant sans réécriture ni réactivation d’une annonce archivée/rejetée. Limite : un post dont le texte source change constitue une nouvelle empreinte ; ce mécanisme n’est pas une détection sémantique des doublons.

## Visibilité et déploiement

Le lecteur public et la requête paginée acceptent `confirmed` **ou** `not_required`, uniquement avec `APPROVED` + `IN_PROGRESS`. Les écritures Firestore clientes restent interdites, y compris l’auto-attribution d’une exemption. La projection publique reste une liste blanche.

Déployer conjointement l’admin, le Web et les règles Firestore pour une prise en charge complète. Les index composites existants de `quick_listings` restent utilisés. Aucun déploiement ni conversion rétroactive de données réelles n’est inclus dans ce changement.

## Vérifications

- Jest admin : conversion, attribution privée, validation, permissions, déduplication concurrente, non-réactivation, lot mixte avec photos, téléchargement échoué, données mal formées.
- Jest Web : projection/visibilité, pagination et non-régression paiement public.
- Émulateur Firestore isolé : exemption lisible seulement après approbation, création cliente interdite, documents privés inaccessibles.
- TypeScript Web/admin et lint ciblé admin.

Les tests d’import simulent les services externes : aucun post réel ni paiement n’est créé. La vérification visuelle et un import manuel en environnement dev restent à effectuer avant déploiement.

Validation du 29 octobre 2026 : 7 suites, 77 tests réussis (admin 16, Web 31, règles Firestore 30). TypeScript Web et admin sans erreur ; lint des trois fichiers admin concernés et `git diff --check` réussis. Émulateur arrêté après les tests.
