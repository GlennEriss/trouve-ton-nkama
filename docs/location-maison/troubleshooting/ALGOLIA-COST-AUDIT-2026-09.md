# Audit coûts Algolia (2026-09)

**Demande directe de l'utilisateur** : « depuis un temps algolia a des factures assez salées
alors qu'on gagne même pas encore 100f avec trouve ton nkama... Algolia offre 10 mille requêtes
gratuites par mois... je veux qu'on essaye de voir un système qui gère mieux les requêtes
Algolia ». Deuxième volet : existe-t-il une bibliothèque gratuite équivalente ?

## 🔴 Corrigé — Une requête Algolia partait sur CHAQUE page du site, y compris celles sans aucune recherche

**Diagnostic, pas une supposition** : tracé le trafic réseau réel (Playwright) vers
`*.algolia.net`/`*.algolianet.com` sur plusieurs pages qui n'ont structurellement aucun rapport
avec la recherche.

**Avant correctif** :

| Page | Appels Algolia |
|---|---|
| `/` (accueil) | 6 (dont 3 requêtes logiques distinctes) |
| `/privacy-policy` | 2 |
| `/terms-of-use` | 3 |
| `/blog` | 2 |
| `/demandes-recherche` | 1 |
| `/publicite` | 2 |

**Cause** : `AlgoliaRefinementsContext.tsx` (`AlgoliaRefinementsProvider`) était monté
globalement dans `src/providers/providers.tsx`, donc actif sur **toutes** les pages de
l'app (publiques ET protégées, via `RootLayout` → `Providers` → `{children}`). Il appelait sans
condition 6 connecteurs InstantSearch actifs : `useMenu({attribute:"city"})`,
`useMenu({attribute:"street"})`, `useRefinementList({attribute:"typeProperty"})`,
`useRefinementList({attribute:"tags"})`, `useSearchBox()`, `useHits()` — chacun de ces
connecteurs déclenche une vraie requête Algolia dès qu'il est monté.

**Le pire** : recherche globale dans tout le code (`grep -rln "useAlgoliaRefinements"`) — **aucun
composant n'utilisait ce contexte**. Zéro consommateur. Une facture pour zéro fonctionnalité,
sur chaque page, depuis son introduction (confirmé par `git log --follow` : présent dès les
premiers refactors de ce module).

**Correctif** : `AlgoliaRefinementsProvider` retiré de `providers.tsx`, fichier
`AlgoliaRefinementsContext.tsx` supprimé (code mort).

**Après correctif** (même trace, mêmes pages) :

| Page | Appels Algolia |
|---|---|
| `/` (accueil) | 4 (composant `HomePage.tsx` — `useRefinementList`, réellement consommé par le carrousel de catégories, légitime) |
| `/privacy-policy` | **0** |
| `/terms-of-use` | **0** |
| `/blog` | **0** |
| `/demandes-recherche` | **0** |
| `/publicite` | **0** |
| `/annonce/[id]` (fiche annonce — probablement la page la plus visitée du site) | **0** |
| `/signin` | **0** |

**Vérifié** : `tsc --noEmit` propre, suite Jest complète **1571/1571** (aucune régression — cohérent
avec zéro consommateur réel).

**Impact attendu** : la quasi-totalité du trafic d'un site immobilier va vers les fiches
annonces, les pages SEO et le contenu (blog, accueil) — pas vers `/search` elle-même. Ce
correctif élimine une requête facturée sur CETTE majorité du trafic, sans aucun changement
fonctionnel visible.

**Fichiers** : `src/providers/providers.tsx`, `src/providers/AlgoliaRefinementsContext.tsx`
(supprimé).

---

## Composition du volume restant (légitime, sur `/search` uniquement)

Un chargement de `/search` déclenche **6 requêtes POST** (en dev, `reactStrictMode: true` double
certains effets — le chiffre réel en production est probablement plus proche de 3 requêtes
logiques distinctes) :
- facettes `typeProperty` (compteurs par type de bien)
- facettes `province`
- facettes `tags`
- les résultats (`hits`) eux-mêmes

**Bonne nouvelle vérifiée en creusant** : la recherche texte de `/search` (les pages réellement
montées, `SearchDesktopPage.tsx`/`SearchMobilePage.tsx`) ne déclenche **pas** de requête à
chaque frappe clavier — le texte de recherche vient d'un paramètre d'URL (`?query=`), lu une
fois via `FilterProviders.tsx`. Le seul composant qui utilise `useSearchBox` (recherche "live")
est `SearchPage.tsx`, qui n'est monté nulle part dans le routing réel (code mort, non touché ici
— hors périmètre de cette demande).

**Pages SEO statiques** (`/immobilier/[transaction]/[type]/[city]`) : 7 villes × 5 types × 2
transactions + 10 pages globales = **80 pages**, chacune interroge Algolia une fois côté serveur
via `generateStaticParams` (au build) puis au maximum une fois par heure par page grâce à
`revalidate = 3600` (ISR) — volume déjà borné, pas une priorité.

## Recommandations non implémentées (décision produit à prendre)

Par ordre d'impact probable, non fait ici car chacune implique un vrai choix produit :

1. **Mettre en cache côté serveur les compteurs de facettes** (Redis, déjà utilisé ailleurs dans
   ce même dépôt pour d'autres caches) avec un TTL de quelques dizaines de secondes à quelques
   minutes — un compteur "23 studios disponibles" n'a pas besoin d'être exact à la seconde près.
   Remplacerait 1 requête Algolia par visiteur par 1 requête Algolia par fenêtre de cache
   (partagée entre tous les visiteurs de cette fenêtre), pour la partie la plus coûteuse du
   volume restant.
2. **Réduire le nombre de facettes demandées par requête** sur `/search` si toutes ne sont pas
   affichées immédiatement (ex. charger les facettes secondaires à la demande, pas au premier
   rendu).
3. Retirer `SearchPage.tsx` du dépôt (code mort confirmé, utilise `useSearchBox` — aucun risque
   de coût aujourd'hui puisqu'il n'est jamais monté, mais clarifierait le code pour la suite).

## Alternative gratuite à Algolia — recherche demandée

**Il n'existe pas d'équivalent 100% gratuit et zéro-infrastructure** (Algolia lui-même n'est
gratuit que jusqu'à 10k requêtes/mois — au-delà, toute alternative a un coût quelque part,
même minime). Trois options réalistes, du plus proche du fonctionnement actuel au plus radical :

| Option | Coût | Effort de migration | Remarque |
|---|---|---|---|
| **Meilisearch** (auto-hébergé) | Gratuit (open-source, MIT) + un petit serveur (~5$/mois, ou VM gratuite type Oracle Cloud free tier) | Faible-moyen — adaptateur officiel `@meilisearch/instant-meilisearch`, largement compatible avec `react-instantsearch` déjà utilisé ici | Le plus proche d'un remplacement direct, sans refonte du front |
| **Typesense** (auto-hébergé) | Identique à Meilisearch | Identique — a aussi un adaptateur InstantSearch | Alternative équivalente, à choisir sur préférence technique plutôt que fonctionnalité |
| **Firestore natif, sans moteur de recherche externe** | Vraiment 0€ (déjà payé pour Firestore) | Élevé — remplace InstantSearch par des requêtes Firestore composites (ville/type/transaction/prix), déjà le modèle utilisé ailleurs dans ce même dépôt (ex. `search_requests`) | Perd la recherche floue/texte libre tolérante aux fautes ; viable si l'essentiel de l'usage réel est du filtrage structuré (ville, type, prix) plutôt que du texte libre — à vérifier avec de vraies données d'usage avant de trancher |

**Recommandation** : vu le stade du produit (pré-revenu), l'option la plus sûre à court terme
est déjà faite (éliminer le gaspillage). Si le volume légitime dépasse encore 10k/mois après ce
correctif, Meilisearch auto-hébergé est le choix le plus pragmatique (changement de code limité,
coût fixe et prévisible au lieu d'un coût par requête). Basculer entièrement sur Firestore ne
vaut le coup que si l'usage réel du texte libre est marginal — ça se vérifie avec les vraies
requêtes des visiteurs, pas en devinant.

*Créé le 2026-09-04.*
