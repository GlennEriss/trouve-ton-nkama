# Feuille de route — ordre de priorité

Comme pour occazGabon, cette roadmap est structurée **par phases/déclencheurs, pas par dates** —
chaque phase a une raison de passer avant/après la suivante, pas juste un calendrier arbitraire.

## Phase 1 — Corrections de coût à impact immédiat

**Pourquoi en premier** : effort faible (quelques heures), aucun risque produit, impact direct
sur la facture Firebase/Algolia actuelle — indépendant de toute nouvelle fonctionnalité, donc pas
de raison de faire attendre.

- [ ] Cache sur `trackPropertyInteraction`/`getPropertyStatistics` — voir
  [refactoring-optimisation-couts.md §1.1](./refactoring-optimisation-couts.md#11-trackpropertyinteraction-fait-2-3-lectures-firestore-non-cach%C3%A9es-%C3%A0-chaque-clic)
- [ ] `DO_FULL_INDEXING=false` sur l'extension Algolia — voir
  [refactoring-optimisation-couts.md §1.2](./refactoring-optimisation-couts.md#12-r%C3%A9indexation-algolia-compl%C3%A8te-%C3%A0-chaque-d%C3%A9ploiement-de-lextension)

## Phase 2 — Réels + cadeaux + abonnement

**Pourquoi ensuite** : c'est l'initiative la mieux spécifiée des deux nouvelles fonctionnalités
(le modèle économique est clair : cadeaux → notification → paywall abonnement), et celle qui
répond le plus directement au problème structurel identifié dans
[01-vision.md](./01-vision.md) (concurrencer les groupes WhatsApp/Facebook sur leur propre
terrain : la vidéo courte).

**Déclencheur pour démarrer** : les points ouverts de
[reels-cadeaux-abonnement.md](./reels-cadeaux-abonnement.md#ce-qui-reste-%C3%A0-trancher-avant-de-scoper-le-d%C3%A9veloppement)
doivent être tranchés avant d'écrire du code — en particulier le choix transcodage vidéo
(Cloud Function maison vs service tiers), qui conditionne l'architecture.

Ordre interne suggéré à l'intérieur de cette phase :
1. Modération des réels (extension directe du pattern `moderationStatus` existant — pas de
   nouveau système à inventer).
2. Upload/lecture vidéo + feed vertical (le socle, sans cadeau ni abonnement).
3. Boutons WhatsApp/appel (rapide — réutilise numéro de contact déjà sur `Property`/`User`).
4. Cadeau + paiement (dépend de la clarification Mobicash/MyPayGa).
5. Dashboard cadeaux reçus + paywall abonnement.

## Phase 3 — Zone "je recherche" (en parallèle, côté analyse seulement)

**Pourquoi pas encore en développement** : le modèle économique n'est pas tranché (voir
[recherche-annonces-inversee.md](./recherche-annonces-inversee.md)) — développer avant de
trancher ce point risque de construire la mauvaise chose. Mais la réflexion peut avancer
**pendant** que la Phase 2 est en développement, pour être prête à scoper dès que la Phase 2
livre (elle réutilisera probablement l'infrastructure d'abonnement construite en Phase 2 —
voir Option C du document dédié).

- [ ] Décider le modèle économique (option A/B/C)
- [ ] Décider modération + durée de vie d'une demande
- [ ] Décider mécanisme de réponse annonceur (in-app vs contact direct)
- [ ] Une fois ces 3 points tranchés : écrire une vraie spec de développement (ce document n'en
  est pas une)

## Phase 4 — Refactoring de fond (en continu, interlacé)

**Pourquoi en dernier dans l'ordre, mais pas "plus tard"** : contrairement à la Phase 1, ces
points ([refactoring-optimisation-couts.md §2](./refactoring-optimisation-couts.md#2--%C3%A0-planifier--dette-r%C3%A9elle-effort-moyen))
n'ont pas d'urgence coût immédiate — c'est de la maintenabilité, pas une facture qui grimpe. Ne
pas les traiter comme un chantier séparé qui bloque le reste : les interlacer avec la Phase 2
quand c'est naturel (ex: le nouveau module Réels côté admin est l'occasion d'appliquer directement
le pattern Strategy plutôt que de créer une 3e chaîne de conditions par type de bien).

- [ ] Utilitaire `toIso` partagé (`packages/core`) — à faire dès qu'on retouche `packages/core`
  pour une autre raison.
- [ ] Mappers/pagination communs pour les repositories admin.
- [ ] Port du pattern Strategy/Factory vers `dashboard/listings/new/page.tsx` — bon candidat à
  faire **en même temps** que la Phase 2 si le module Réels admin touche à cette page de toute
  façon.
- [ ] Stratégie de gestion des images (chargement, affichage, stockage) — voir
  [refactoring-optimisation-couts.md §5](./refactoring-optimisation-couts.md#5-strat%C3%A9gie-de-gestion-des-images-%C3%A0-revoir).
  À investiguer avant la Phase 2 si possible : le module Réels va de toute façon poser la question
  du stockage/CDN pour la vidéo, autant trancher la stratégie médias (images + vidéo) une seule
  fois plutôt que deux fois séparément.

## Ce qui n'est volontairement pas dans cette roadmap

- Refonte visuelle globale, nouveau prestataire de paiement générique, big-bang refactor — voir
  [01-vision.md](./01-vision.md) "Ce qu'on ne fait pas".
