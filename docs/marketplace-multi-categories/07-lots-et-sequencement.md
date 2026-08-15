# Lots et séquencement

## Le principe qui commande l'ordre

Le chantier le plus coûteux est le **formulaire de publication** (14 builders à remplacer par un
moteur générique). L'instinct est de commencer par là, puisque « sans formulaire, pas
d'annonces ».

C'est faux dans ce produit : **l'offre est aujourd'hui majoritairement saisie par l'admin**
(back-office, import). La même voie permet de constituer le stock mode initial. Le formulaire
public sort donc du chemin critique et descend au lot 7.

Conséquence : on peut ouvrir la catégorie mode, la voir vivre, et mesurer la demande **avant**
d'engager le refactoring le plus lourd. Si la mode ne prend pas, les 14 builders n'auront jamais
été touchés.

Second principe : **rien n'est exposé au public tant qu'il n'y a pas de stock.** Une catégorie
vide visible fait plus de mal qu'une catégorie absente.

## Les lots

### Lot 0 — Taxonomie et administration des catégories
Collection `listing_categories` (`parentId`, `slug`, `name`, `icon`, `order`, `isActive`,
`attributeSchema`, `imageRatio`, `locationPrecision`, `hasMapView`, `defaultDensity`,
`defaultSort`, `promotionPricing`, `minListingsForHomeSection`). Module admin
`category-management` calqué sur `tag-management`, permission `categories.manage`. Seed de
l'arbre Immobilier + Mode.
**Sortie :** un admin crée une catégorie et son schéma d'attributs, sans déploiement.
**Rien n'est visible côté public.**

### Lot 1 — Modèle d'annonce générique
`categoryId`, `categoryPath`, `attributes` sur le modèle. Script de backfill :
`categoryPath = ["immobilier", <typeProperty>]` sur l'existant. Indexation Algolia des attributs
à plat (`attr_*`) + facette hiérarchique `categoryPath.lvl0/lvl1` + resynchronisation des
`attributesForFaceting` à la sauvegarde d'une catégorie.
**Sortie :** toutes les annonces existantes sont catégorisées, aucun changement visible.
**Point d'attention :** les champs immobiliers (`area`, `status`, coordonnées) restent en place
et font autorité pour l'immobilier. Aucune suppression dans ce lot.

### Lot 2 — Saisie admin d'une annonce mode
Formulaire admin piloté par `attributeSchema`. C'est le premier consommateur du moteur de
schéma, dans un environnement à faible risque (utilisateurs internes, pas de SEO, pas de
conversion en jeu).
**Sortie :** l'équipe peut saisir des annonces mode réelles et constituer le stock.

### Lot 3 — Carte d'annonce universelle et favoris
`ListingCard` avec ses trois densités et son slot d'attributs. **Suppression du `fetch` par
carte** de `PropertyCard` (`isDirectOwner` passe par l'index). Le système de favoris existe déjà
(`favoris: string[]` sur l'utilisateur, `ButtonFavoris.tsx`, page `/favoris`) et fonctionne pour
n'importe quelle catégorie sans modification — ce lot ajoute seulement `favoriteCount` agrégé
sur l'annonce, utile pour la preuve sociale et la monétisation (lot 8).
**Sortie :** les grilles existantes utilisent le nouveau composant sans régression visuelle sur
l'immobilier.
**Pourquoi ici :** c'est un lot transverse, visible, à risque faible, qui bénéficie
immédiatement à l'immobilier — donc il se valide sur du trafic réel avant que la mode n'arrive.

### Lot 4 — Recherche multi-catégories ✅ fait (2026-08-13)
**Correction en cours de route :** `/search` n'a jamais eu de carte à découpler (erreur du
doc initial, voir 03-page-recherche.md) — ce lot est donc sorti beaucoup moins risqué que
prévu. Fait : filtre `categoryPath.lvl0` dans `buildPublicSearchFilters`, endpoint public
`GET /api/categories/active`, sélecteur `CategoryFilterPills` (masqué tant qu'il n'y a pas
≥2 catégories racine actives — donc invisible aujourd'hui, Mode étant inactif), préservation
du paramètre `category` à travers les soumissions du formulaire de filtres existant.
**Non fait, différé** : panneau de filtres généré depuis `attributeSchema` (aucune valeur
tant que Mode n'a pas de stock réel) ; compteurs de résultats par catégorie ; densité de
grille adaptée par catégorie (les résultats mode s'afficheraient en densité `standard`,
pas `compact`, jusqu'à un futur ajustement).

### Lot 5 — Accueil par sections de catégories ✅ mécanisme fait (2026-08-13)
Fait : `GET /api/categories/home-sections` (comptage Firestore `.count()` par catégorie racine
active, échantillon de 10 si le seuil `minListingsForHomeSection` est atteint, **immobilier
toujours exclu** — il a déjà Tendances/Récentes/Par province, dupliquer un rail serait
redondant) + composant `CategoryHomeSections` monté sur les deux accueils (desktop et mobile),
juste après "Récentes". **Correction** : `TrendingSection`/`RecentSection`/`FeaturedSection`
n'avaient en réalité **jamais** de filtre `typeProperty` — "généraliser" ces sections était déjà
vrai par construction, aucun code à changer là. `PropertyByProvince` non touché (reste
implicitement immobilier tant que Mode n'a pas de stock, rien à casser).
**Sortie mécanique livrée, ouverture publique PAS encore effective** : `CategoryHomeSections`
se masque tant qu'aucune catégorie active hors immobilier n'atteint son seuil — aujourd'hui
Mode est inactive et sans stock réel, donc invisible. **L'ouverture publique réelle de Mode
reste une décision produit + opérationnelle** (seed + backfill + activation + stock via le
Lot 2), pas un déploiement de code.
**Bug réel trouvé en testant avec du stock (2026-08-14)** : une fois Mode active + du stock
mock créé, `/api/categories/home-sections` renvoyait 500 (donc 0 annonce visible) — l'index
composite Firestore documenté en commentaire dans le fichier (`categoryPath.lvl0 Asc, state
Asc, moderationStatus Asc, createdAt Desc`) n'avait jamais été créé. Corrigé en l'ajoutant à
`firestore.indexes.json` (+ l'équivalent pour les réels, `categoryPath.lvl0/processingStatus/
moderationStatus/createdAt`, avant que Mode n'ait de réels) et en déployant
(`firebase deploy --only firestore:indexes`) contre dev **puis contre prod** (2026-08-14, à la
demande explicite de l'utilisateur) — opération purement additive (création d'index, aucune
donnée touchée, aucun index existant supprimé sur les deux environnements). Les deux
environnements ont désormais l'index avant même l'activation publique de Mode en prod.
**Revu le 2026-08-15 (demande utilisateur explicite)** : "immobilier" n'est plus exclu de
`GET /api/categories/home-sections` — il participe désormais comme n'importe quelle catégorie
racine, avec `minListingsForHomeSection:0` (rail toujours affiché dès qu'il y a une annonce
APPROVED). Redondant avec Tendances/Récentes/Par province, assumé : objectif = même lisibilité
par catégorie que le rail Mode, pas une home minimaliste. `roots` désormais trié par le champ
`order` des catégories (immobilier=0 avant mode=10) plutôt que par l'ordre Firestore non
garanti. **Piège de données dev découvert en vérifiant** : le backfill `categoryId`/
`categoryPath` (Lot 1) n'avait tourné qu'en PROD (931 annonces) — jamais contre dev, où seuls
les 20 mocks Mode portaient ces champs. Corrigé en relançant
`backfill-listing-categories.js --apply` contre dev (19 annonces immobilier migrées) ; 6
passées manuellement en `moderationStatus:APPROVED` pour vérification visuelle (données de
test dev sans rapport avec la logique produit).

### Lot 6 — URLs migrées ✅ fait (2026-08-13) ; fiche générique par catégorie non fait
Fait : nouvelle route `/annonce/[id]` (contenu identique à l'ancienne page), `/houseDetails/[id]`
remplacée par une redirection pure (`permanentRedirect`, 308), 16 producteurs de liens internes
repris (grep exhaustif, pas de relecture partielle) + 3 tests unitaires + 1 e2e alignés.
**Correction** : les réels ne pointaient déjà PAS vers `/houseDetails` (ils partagent
`/reels/<id>`) — une affirmation antérieure de 04-page-detail.md était fausse, corrigée.
**Non fait, différé** : bloc de caractéristiques généré par catégorie, localisation
conditionnelle, annonces similaires par catégorie, données structurées `Product`/`Offer` — la
page `/annonce/[id]` reste pour l'instant une page immobilier (structured data
`RealEstateListing`), correcte tant que Mode n'atteint pas cette page (Lot 2 la garde en
PENDING). Ce chantier reste à faire avant que Mode ne devienne réellement consultable.
**Point d'attention resté valable :** seul lot difficilement réversible du chantier —
déploiement à isoler des autres changements, pas à fusionner dans un déploiement groupé.

### Lot 7 — Formulaire public piloté par schéma + assistant IA ✅ fait (2026-08-13)
Décision utilisateur : le formulaire public doit aussi utiliser l'assistant IA, comme
l'immobilier (`app/api/ai/property-draft`, Gemini, 1 crédit/génération). Fait, en **parallèle**
de ce pipeline immobilier — pas une extension de `AIFormService`/`AIPromptsService`, qui
restent strictement immobilier (12 `CREATABLE_TYPES` en dur) :
- `GET /api/categories/publishable-leaves` : feuilles actives hors immobilier, avec leur
  `attributeSchema` — un seul appel, tout ce dont le formulaire a besoin.
- `POST /api/ai/category-listing-draft` : prompt Gemini **généré depuis `attributeSchema`**
  (pas de type en dur), même convention crédit (1, débité seulement si réponse exploitable,
  transaction Firestore). Service `ai-category-listing.service.ts` (prompt + parsing, séparé
  de `ai-form.service.ts`/`ai-prompts.service.ts` immobilier).
- Page `app/(protected)/category-listing/create/page.tsx` : catégorie → description libre +
  bouton "Générer avec l'IA" → champs pré-remplis éditables (titre/description/prix/ville/
  attributs) → upload photos (`useImageDropzone`/`createFile`, réutilisés tels quels) →
  `createProperty()` (même fonction client que l'immobilier, force déjà `moderationStatus:
  'PENDING'`). **Vérifié : les Firestore Security Rules de `properties` (`create`) ne
  valident QUE `isAnnouncer()` + `createdBy` + `moderationStatus == 'PENDING'` — aucune forme
  immobilière imposée, donc aucune règle à modifier.**
- **Révisé sur retour utilisateur (2026-08-13)** : au lieu d'une 4e carte "Publier un
  article" séparée sur `/publish`, un seul point d'entrée unifié — "Publier une annonce"
  (description neutralisée, ne dit plus "Louer ou vendre un bien") mène désormais à
  `/publish/category`, un choix de catégorie racine (`GET /api/categories/active`, même
  source que `CategoryFilterPills`) qui route vers `/property/create` (immobilier) ou
  `/category-listing/create` (toute autre racine). **Si une seule racine est active** (état
  réel en prod tant que Mode n'est pas ouverte), l'étape de choix est **sautée
  automatiquement** — zéro clic supplémentaire, zéro régression sur le parcours immobilier
  actuel.
- **Révisé une 2e fois (design, sur mockup style occazGabon)** : l'étape 1 n'a plus de
  sélecteur de catégorie ni de champs manuels — **l'IA détecte la catégorie elle-même**
  (comme `typeProperty` côté immobilier), à partir de la seule description + photos. Le
  clic sur "Générer l'annonce" crée directement l'annonce (PENDING) et redirige vers une
  **preview brouillon éditable** (`category-listing/create/preview/[id]`,
  `PreviewCategoryListingDraft.tsx`) — même gabarit que `PreviewPropertyDraft.tsx`
  immobilier (crayons `EditableField`, `updateProperty` par champ, pas de bouton "Publier"
  séparé). Localisation simplifiée : pas de ville/province sur l'étape 1, province par
  défaut Estuaire, tout corrigible sur la preview.
- **Les 14 builders immobiliers restent en place**, non touchés.
- **Révisé une 3e fois (navigation admin, retour utilisateur)** : la saisie admin mode
  (Lot 2) n'a plus d'entrée sidebar séparée "Nouvelle annonce" — redondant avec le module
  "Annonces" existant. Le module `/dashboard/listings` a maintenant deux onglets
  (Immobilier / Mode) : l'onglet Immobilier est l'ancien contenu intact (renommé
  `ImmobilierListingsPanel`, corps de fonction non touché) ; l'onglet Mode est une table
  neuve et volontairement simple (`ModeListingsPanel`) avec son propre bouton "Nouvelle
  annonce", plutôt qu'un retrofit du panneau immobilier (14 filtres construits autour de
  `typeProperty`, trop risqué à adapter).
**Sortie :** un vendeur peut publier lui-même dans une catégorie active, assisté par l'IA —
mécaniquement prêt, invisible tant que Mode n'est pas activée avec du stock.

### Lot 8 — Monétisation ✅ fait (2026-08-14)
**Décision utilisateur** qui a simplifié le lot : pas de quota gratuit — coût en crédits dès
la 1ère annonce, uniforme toutes catégories. Déjà vrai par construction (brouillon IA = 1
crédit, immobilier et mode, Lot 7) : rien à construire pour ça. Seul point réellement ouvert
traité ici : **retarification des promotions par catégorie**.
- `promotionPricing` ajouté au modèle `ListingCategory` (admin), validé (bornes crédits/durée),
  éditable en JSON depuis `/dashboard/categories` (create + edit), seedé pour Mode (boost 3cr,
  tendance 3j 5cr, tendance 7j 7cr, mise à la une 10cr — vs 3/5/10/15 immobilier).
- `app/api/property/promote/route.ts` (**endpoint live, débite de vrais crédits**) lit
  maintenant `property.categoryId` → `listing_categories/{id}.promotionPricing` **à
  l'intérieur de la même transaction Firestore** (pas de lecture hors transaction, cohérence
  garantie) ; absent ou catégorie non trouvée ⇒ repli sur la grille immobilier historique,
  strictement inchangée. Vérifié par la suite de tests dédiée existante (10 tests) ET par le
  test d'intégration sur **émulateur Firestore réel** (transaction + idempotence) — tous verts
  sans modification.
- **Bug de seed trouvé et corrigé pendant les vérifications** : relancer le script de seed
  écrasait `isActive` (et aurait écrasé `attributeSchema`/`promotionPricing`/`order`) sur des
  catégories déjà configurées depuis le dashboard — un rejeu de seed ne doit jamais revenir sur
  une décision admin. Script rendu réellement idempotent : ne crée que les catégories absentes,
  ne touche plus jamais celles qui existent déjà.
**Point d'attention resté valable :** l'instrumentation (comptes au-dessus d'un futur seuil,
taux de clic contact, favoris) reste à construire si un modèle de quota/abonnement est
introduit plus tard — non fait ici, cohérent avec la décision "pas de quota" de ce lot.

### Lot 9 — Réels par catégorie ✅ fait (2026-08-14)
- `categoryPath` ajouté au modèle `Reel` (optionnel — les réels orphelins, sans annonce liée,
  n'ont pas de catégorie). Capturé depuis l'annonce liée à deux points d'écriture : création du
  réel (`POST /api/reels`, `assertOwnedProperty` retourne désormais l'annonce au lieu de
  `void`) et rattachement a posteriori (`PATCH .../attach-property`).
- `getPublicReels()` (`db/reel.db.ts`) accepte un `categoryRootName` optionnel ; si absent,
  requête strictement identique à avant (aucun risque pour le feed actuel). Si présent, filtre
  `where('categoryPath.lvl0', '==', categoryRootName)` — **nécessite un index composite Firestore
  manuel** (`categoryPath.lvl0 Asc, processingStatus Asc, moderationStatus Asc, createdAt Desc`),
  documenté en commentaire dans le fichier ; tant qu'il n'est pas créé, un onglet catégorie
  échouerait et le client retombe sur "Tout" (repli côté `ReelsFeedClient`).
- `GET /api/reels/feed` accepte un paramètre `category`, clé de cache changée en
  `reels:feed:${categoryRootName ?? 'all'}:...` pour ne jamais mélanger les caches par catégorie.
- `ReelsFeedClient` : onglets de catégorie en overlay (pills `bg-black/50 backdrop-blur-sm`,
  "Tout" + catégories actives), **masqués tant qu'il y a moins de 2 catégories actives** — même
  seuil de self-gating que `CategoryFilterPills`/`CategoryHomeSections`, donc invisible
  aujourd'hui. Changement d'onglet → reset `activeIndex` + `scrollTo(0)` sur le carousel, et
  `queryKey` React Query inclut le filtre pour ne pas mélanger les pages de résultats.
- Liens de partage : déjà sur `/annonce/[id]` depuis le lot 6, rien à changer ici.
**Bugs de test corrigés en cours de route (pas de bug fonctionnel réel)** : clé de cache
attendue dans `reels-feed.test.ts` non mise à jour après l'ajout du segment catégorie ; mock
`@tanstack/react-query` de `reels-feed-client.test.tsx` ne fournissait que `useInfiniteQuery`
(ajout de `useQuery`) ; mock du carousel (`carouselApi`) sans `scrollTo`. Suite reels complète
(8 fichiers, 70 tests) verte, `tsc --noEmit` propre.
**Sortie :** le feed mode alimente l'acquisition et les cadeaux, mécaniquement prêt et invisible
tant que Mode n'est pas ouverte (même logique que les lots 4/5).

### Lot 10 — Convergence immobilière (différé, non planifié)
Migration des 14 builders vers le moteur générique, rapatriement de `tags.json` dans
l'`attributeSchema` de la catégorie Immobilier, absorption de `area`/`status`/`typeProperty`
dans `attributes`, suppression du code mort.
**Condition d'entrée :** le moteur générique a encaissé plusieurs mois d'annonces réelles sur au
moins deux catégories. Tant que cette condition n'est pas remplie, ce lot n'est pas ouvert.

## Vue d'ensemble

| Lot | Objet | Risque | Visible du public |
|---|---|---|---|
| 0 | Taxonomie + admin catégories | Faible | Non |
| 1 | Modèle générique + backfill + index | Moyen | Non |
| 2 | Saisie admin mode | Faible | Non |
| 3 | Carte universelle + favoris | Moyen | Oui (immobilier) |
| 4 | Recherche multi-catégories | **Élevé** | Oui |
| 5 | Accueil par sections | Moyen | **Ouverture mode** |
| 6 | Fiche détail + URLs | Moyen (**irréversible**) | Oui |
| 7 | Formulaire public générique | Élevé | Oui |
| 8 | Monétisation | Faible | Oui |
| 9 | Réels par catégorie | Faible | Oui |
| 10 | Convergence immobilière | Élevé | Non |

## Points de contrôle

Trois moments où l'on décide de continuer ou d'arrêter, plutôt que de dérouler jusqu'au bout par
inertie :

- **Après le lot 2** — le stock mode se constitue-t-il à un rythme acceptable par la saisie
  admin ? Si non, le problème est l'offre, pas le produit : inutile de construire la recherche.
- **Après le lot 5** — la catégorie mode reçoit-elle du trafic et des clics contact ? Si non, ne
  pas engager le lot 7 (le plus cher).
- **Après le lot 8** — des vendeurs paient-ils ? Si non, revoir le modèle avant d'ajouter
  Véhicules.

## Ce qui reste hors périmètre

- Import Apify / social import pour la mode
- Pages SEO de catégorie (`/c/mode/...`) — à ouvrir seulement quand le stock est suffisant
- Recherche IA (`search-with-ia`), qui reste restreinte à l'immobilier
- Slug dans l'URL d'annonce (`/annonce/robe-zara-a3f9`)
- Guide des tailles, alertes sur favoris, avis vendeurs
