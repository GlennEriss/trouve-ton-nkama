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

**Déclencheur pour démarrer** : les 5 points ouverts de
[reels-cadeaux-abonnement.md](./reels-cadeaux-abonnement.md#d%C3%A9cisions-tranch%C3%A9es) sont
désormais **tranchés** — Mobicash = Moov Money (déjà supporté), compte obligatoire pour les dons,
abonnement 3 000–5 000 FCFA/mois, transcodage en Cloud Function maison (pas de service tiers
payant), réels jusqu'à 5 min dans le flux swipe. Phase 2 est prête à être scopée/développée.

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

- [x] Utilitaire `toIso` partagé (`packages/core`).
- [x] Mappers/pagination communs pour les repositories admin.
- [x] Port du pattern Strategy/Factory vers `dashboard/listings/new/page.tsx` (et `announcers/page.tsx`,
  et la validation serveur `listing-validation.ts` — les 3 duplications de la règle "champs requis
  par type de bien" unifiées en une seule table de règles).
- [x] Vignette à l'upload (voir [refactoring-optimisation-couts.md §5](./refactoring-optimisation-couts.md#5-strat%C3%A9gie-de-gestion-des-images-%C3%A0-revoir)) —
  fait, coût nul. Réactivation de l'optimiseur Next/Vercel Pro et CDN restent ouvertes ; le module
  Réels posera de toute façon la question du stockage/CDN vidéo, à trancher à ce moment-là.

## Chantier transversal — Migration vers un backend commun (à planifier)

Ajout demandé le **30 octobre 2026**. **Statut : ⬜ à faire**, aucune implémentation engagée par cette inscription. Priorité et calendrier à confirmer, sans réordonner les lots déjà convenus (notamment Brevo et facturation MyPayGa).

### Orientation retenue

- Backend **NestJS / Node.js en TypeScript**, commun au Web/PWA, au mobile et au dashboard admin.
- Conserver **Firebase Auth, Firestore et Storage** ; déplacer progressivement les responsabilités métier et l'accès aux données vers le backend.
- Une application backend modulaire au départ, **pas de microservices**.
- Une **gateway / reverse proxy** comme entrée API commune. Solution et hébergement à choisir après audit ; pas de seconde application personnalisée sans besoin démontré.
- **Pas de serveur discovery au démarrage** : les modules vivent dans la même application. À réévaluer uniquement si des services indépendants apparaissent.
- Les frontends gardent vues, navigation, état d'interface et validations ergonomiques ; le backend fait autorité pour les validations métier, permissions, paiements, modération et données exposées.

### Tâches à réaliser

- [ ] Auditer Web, mobile, admin, API Next.js et Cloud Functions : cartographier règles, accès Firebase, intégrations, duplications et consommateurs.
- [ ] Définir les modules, contrats API versionnés et projections publiques/propriétaire/admin ; distinguer les contrats partagés des modèles de stockage privés.
- [ ] Concevoir l'authentification compatible avec les sessions actuelles et les jetons Firebase ; autorisations côté backend obligatoires, car l'Admin SDK ne dépend pas des Security Rules clientes.
- [ ] Choisir gateway, hébergement, configuration dev/prod, gestion des secrets, observabilité et limites de trafic ; conserver l'autorisation métier dans NestJS.
- [ ] Examiner séparément le temps réel, les uploads directs sécurisés et les traitements asynchrones ; ne pas supprimer automatiquement tous les usages clients de Firebase.
- [ ] Établir l'ordre de migration par domaine, les tests de référence, les critères de bascule et le retour arrière avant d'implémenter le socle.
- [ ] Migrer progressivement les responsabilités vers le backend et raccorder les trois frontends, sans double logique métier durable ni double exécution des paiements/notifications.
- [ ] Fermer les anciens chemins d'écriture et retirer le code devenu inutile après validation de chaque domaine ; conserver les contrôles nécessaires pendant la coexistence.
- [ ] Valider sécurité, non-régression fonctionnelle, performances, coûts et E2E sur dev ; déployer progressivement sur autorisation explicite.

**Condition de clôture :** périmètre migré documenté et testé sur les trois applications, autorisations et règles métier centralisées pour ce périmètre, anciens chemins désactivés, surveillance et procédure de retour arrière vérifiées. L'audit détaillé et le choix de gateway restent à faire ; ce suivi n'est pas une architecture technique finalisée.

## Chantier long terme — NexaSearch, alternative à Algolia

- [ ] **Construire notre SDK multi-provider puis notre moteur de recherche**, en TypeScript, avec Firebase conservé comme source métier initiale. Statut : ⬜ à faire, ajouté le 30 octobre 2026.
- [ ] Encapsuler d'abord Algolia sans régression ; conserver son fonctionnement jusqu'à qualification et validation du remplacement.
- [ ] Décomposer et réaliser les phases P0–P7 du [backlog NexaSearch](nexasearch-backlog.md), avec tests de sécurité, synchronisation, pertinence et performances avant bascule.

Chantier coordonné avec le backend NestJS/gateway, sans modifier les priorités déjà convenues. Le SDK et le moteur sont deux livrables distincts ; aucun développement ni retrait d'Algolia n'est engagé par cette inscription.

## Ce qui n'est volontairement pas dans cette roadmap

- Refonte visuelle globale, nouveau prestataire de paiement générique, big-bang refactor — voir
  [01-vision.md](./01-vision.md) "Ce qu'on ne fait pas".
