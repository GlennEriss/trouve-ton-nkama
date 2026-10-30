# NexaSearch — indépendance progressive vis-à-vis d'Algolia

Ajout demandé le **30 octobre 2026**. **⬜ À faire — chantier long terme**, sans implémentation, suppression d'Algolia ni publication externe à ce stade.

## Intention et périmètre

Synthèse du document utilisateur « Développement d’un SDK de recherche universel avec architecture multi-provider ». **NexaSearch** est un nom provisoire. Distinguer deux livrables : un SDK TypeScript indépendant du fournisseur, puis notre propre moteur de recherche alternatif. Une abstraction seule ne remplace pas Algolia.

- Conserver Algolia pendant la transition, encapsulé dans `AlgoliaProvider` ; développer `NexaSearchProvider` séparément.
- Contrat commun de recherche, indexation, suppression et suggestions ; capacités communes distinguées des extensions propres aux providers. Sélection initiale par configuration, non par modification du code métier.
- SDK réutilisable dans plusieurs projets, indépendant des frameworks et du stockage ; Firestore comme première source métier et premier adaptateur envisagé, pas comme dépendance imposée au cœur.
- Moteur cible : tokenisation Unicode/accents, index inversé, recherche textuelle/préfixe, tolérance aux fautes bornée, filtres, pertinence, tri et pagination.
- Index dérivés et reconstruisibles ; Firestore demeure la source de vérité métier.
- Intégrations React, Next.js et React Native compatibles avec la gestion de requêtes existante (TanStack Query).
- Projet open source et packages npm envisagés ; nom de package, licence MIT proposée et publication à confirmer avant diffusion.

## Checklist progressive

- [ ] **P0 — Audit** : cartographier les appels Algolia dans Web/mobile/admin/backend, les index et les fonctionnalités réellement utilisées (facettes, filtres, synonymes, classement, pagination, éventuelle géorecherche), volumes, coûts et latences de référence.
- [ ] **P1 — Contrats et architecture** : définir interfaces, réponses, erreurs, capacités, configuration et tests contractuels ; cadrer MVP, organisation des packages et ADR. Provider/Strategy, Adapter, Factory et injection de dépendances sont les approches proposées, à appliquer sans duplication inutile.
- [ ] **P2 — AlgoliaProvider** : encapsuler l'existant et migrer progressivement les appels sans régression ; préserver les configurations d'index et de pertinence.
- [ ] **P3 — NexaSearch Engine MVP** : implémenter et tester les algorithmes de recherche, indexation, préfixes, pertinence, filtres et tolérance aux fautes sur un volume borné et documenté.
- [ ] **P4 — Firebase et synchronisation** : adapter les documents autorisés, persister les index, gérer création/modification/suppression, concurrence, indexation initiale, reconstruction et reprise sur erreur. Évaluer séparément le mode local et les index Firestore partagés.
- [ ] **P5 — Intégrations** : hooks React/Next.js/React Native, debounce, annulation des réponses obsolètes, chargement, erreurs et pagination ; réutiliser les caches existants.
- [ ] **P6 — Qualification et migration** : tests unitaires, intégration, contrats, sécurité, synchronisation, non-régression et benchmarks représentatifs ; fixer les seuils de décision avant bascule, surveiller et prévoir le retour à Algolia.
- [ ] **P7 — Documentation et distribution** : guides, exemples, versioning, CI et préparation des packages ; publication npm/open source sur décision explicite.
- [ ] **Évolution ultérieure — Fallback** : n'activer un provider de secours qu'après validation de la compatibilité, fraîcheur des index et autorisations. Pas de bascule dynamique ni de fallback automatique dans le MVP par défaut.

## Garde-fous et lien avec le backend

- Coordonner avec la [migration NestJS/gateway](10-roadmap.md#chantier-transversal--migration-vers-un-backend-commun-à-planifier) : la recherche catalogue partagée doit s'intégrer au backend et ne pas recréer des règles métier dans chacun des trois frontends.
- L'absence de serveur dédié est une **possibilité du mode embarqué limité**, pas une garantie pour un moteur catalogue à grande échelle. Évaluer mémoire, réseau, lectures/écritures Firestore, taille et fraîcheur des index avant de retenir l'infrastructure.
- Ne pas télécharger tout le catalogue dans le navigateur pour simuler une recherche serveur. Un index local reste limité aux données autorisées et au volume validé ; IndexedDB/SQLite sont des options à évaluer.
- Garder clés d'administration et écritures d'index privilégiées côté serveur. Contrôler les permissions et l'isolation entre organisations, y compris dans les suggestions et les index ; ne pas supposer qu'un index partagé filtre automatiquement les accès.
- Les benchmarks doivent comparer pertinence, latence, mémoire, réseau, coûts et comportement en panne. Ni parité complète avec Algolia ni économies garanties sans mesures.
- Le document fourni évoque **115–198 heures** : estimation indicative non validée, à refaire après audit. Ce n'est ni un engagement ni une estimation d'un équivalent complet d'Algolia.

## Condition de clôture

Algolia fonctionne derrière le SDK sans régression ; NexaSearch respecte le contrat et les garanties de sécurité sur le périmètre qualifié ; changement de provider par configuration, index reconstruisibles et synchronisés, résultats mesurés et documentation réutilisable. Le retrait d'Algolia reste une décision séparée après validation du périmètre effectivement remplacé.

Priorité et calendrier restent à arbitrer avec les tâches produit existantes. Aucun ticket Yote ni package npm n'a été créé : seule la documentation locale est mise à jour.
