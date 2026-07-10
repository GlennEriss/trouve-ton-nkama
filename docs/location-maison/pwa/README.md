# PWA Production-Grade - Trouve Ton Nkama

## Objectif
Passer d'une PWA fonctionnelle (niveau intermediaire) a une PWA production-grade, stable en reseau instable, sure pour les donnees utilisateur, et observable en production.

## Portee
Cette documentation couvre:
- Architecture cible PWA pour Next.js App Router + `@ducanh2912/next-pwa`.
- Regles de cache runtime (ce qui doit etre cache, ce qui ne doit jamais l'etre).
- UX d'installation (Android/iOS) centralisee.
- Fallback offline propre.
- Strategie de build/deploiement et runbook incident.

Cette documentation ne couvre pas:
- Les plans tarifaires AdSense.
- Les details metier des annonces immobilieres.

## Etat actuel (resume)
Points forts:
- Plugin PWA actif en production.
- Manifest complet avec icones.
- UX d'installation deja presente.

Points a durcir:
- Cache runtime trop large par defaut (risque de stale sur des routes API).
- Deux ecouteurs `beforeinstallprompt` en parallele.
- Pas de fallback offline explicite dedie UX.
- Gouvernance des artefacts SW (`public/sw.js`, `public/workbox-*.js`) a formaliser.

## Cible Production-Grade
### Principes
1. Donnees privees: jamais de cache runtime navigateur (ou strictement controle).
2. Donnees publiques: cache avec TTL court + invalidation simple.
3. Scripts tiers publicitaires/trackers: bypass cache SW.
4. Une seule source de verite pour le prompt d'installation.
5. Offline: experience degradee propre, pas d'erreur technique brute.
6. Mise a jour SW: controlee, observable, reversible.

### Definition of Done (PWA pro)
- Aucune route API sensible servie depuis cache SW.
- Aucune erreur recurrente `no-response` Workbox sur domaines tiers annonces.
- Prompt d'installation unique et deterministic (pas de doublon modal/bouton).
- Page offline dediee affichee quand le reseau est indisponible.
- Checklists QA PWA validees sur Android Chrome et iOS Safari.

## Architecture cible
### 1) Service Worker
- Base: `next-pwa`.
- `runtimeCaching` override pour surcharger les regles par defaut riskees.
- Regles prioritaires:
1. `NetworkOnly` / exclusion stricte pour endpoints auth et donnees privees.
2. `NetworkFirst` pour contenu HTML/pages avec TTL prudent.
3. `StaleWhileRevalidate` pour assets statiques first-party.
4. Exclusion des domaines ads/third-party critiques du cache runtime.

### 2) Manifest et metadata
- `manifest.json` valide W3C.
- Icons PNG multi-tailles + `maskable`.
- `theme-color` coherent avec branding.
- `start_url` et `scope` alignes avec la navigation produit.

### 3) Install UX centralisee
- Remplacer les listeners multiples par une couche unique:
  - `PWAInstallProvider` (client) qui ecoute `beforeinstallprompt`.
  - `usePWAInstall()` pour exposer `canInstall`, `isIOS`, `promptInstall()`.
- Les composants UI (footer, modal home, etc.) deviennent de simples consommateurs.

### 4) Offline UX
- Ajouter une route fallback offline dediee (App Router):
  - `app/~offline/page.tsx`.
- Message UX clair:
  - reseau indisponible,
  - ce qui reste accessible,
  - CTA "Reessayer".

### 5) Observabilite
- Logger client sur:
  - registration SW,
  - update available,
  - activation SW,
  - fallback offline utilise,
  - erreurs runtime caching.
- Event tracking (analytics produit):
  - `pwa_install_prompt_shown`,
  - `pwa_install_accepted`,
  - `pwa_install_dismissed`,
  - `pwa_offline_fallback_hit`.

## Matrice de cache recommandee
| Ressource | Strategie | TTL | Regle |
|---|---|---|---|
| `/_next/static/*` | `CacheFirst` | 24h+ | build hash already safe |
| Images first-party | `StaleWhileRevalidate` | 24h | max entries borne |
| Pages HTML | `NetworkFirst` | court | fallback offline si echec |
| API publique lecture | `NetworkFirst` | 30-120s | seulement endpoints explicitement whitelistes |
| API auth/session/user | `NetworkOnly` | 0 | jamais de cache |
| Scripts Ads/third-party | `NetworkOnly` (ou exclusion cross-origin) | 0 | eviter `no-response` SW |

## Plan d'implementation (phases)
### Phase 0 - Baseline et garde-fous
- Capturer baseline Lighthouse (mobile + PWA audits).
- Lister les endpoints API prives/publics.
- Definir la politique d'artefacts SW (commit ou non commit).

Livrables:
- Rapport baseline.
- Liste d'endpoints classes par sensibilite.

### Phase 1 - Runtime caching strict
- Surcharger les regles par defaut `next-pwa`.
- Exclure les domaines tiers critiques (ads, scripts externes sensibles).
- Interdire explicitement le cache des routes API privees.

Livrables:
- `next.config.ts` durci.
- Validation reseau via DevTools > Application > Cache Storage.

### Phase 2 - Install prompt unifie
- Creer `PWAInstallProvider`.
- Supprimer les listeners dupliques dans plusieurs composants.
- Garder plusieurs UIs possibles (bouton + modal) mais avec un seul provider.

Livrables:
- Hook unique `usePWAInstall`.
- Zero listener duplique.

### Phase 3 - Offline fallback propre
- Creer `app/~offline/page.tsx`.
- Configurer fallback document si reseau indisponible.
- Ajouter action utilisateur "Reessayer".

Livrables:
- Page offline fonctionnelle.
- Parcours offline valide manuellement.

### Phase 4 - Update SW et DX
- Gerer explicitement la mise a jour SW (new SW waiting -> notify -> reload).
- Afficher un bandeau "Nouvelle version disponible".

Livrables:
- Flux de MAJ sans confusion utilisateur.

### Phase 5 - Monitoring et runbook
- Instrumenter erreurs PWA critiques.
- Ajouter runbook incident SW cache.

Livrables:
- Dashboard de suivi.
- Procedure rollback operationnelle.

## Recommandations de code (guide)
### A. Politique API
- Whitelist stricte des endpoints cacheables.
- Tous les endpoints suivants en `NetworkOnly`:
  - auth,
  - session,
  - profil,
  - credits,
  - donnees sensibles utilisateur.

### B. Scripts tiers
- Charger AdSense via `next/script` `afterInteractive`.
- Exclure les host publicitaires du runtime cache cross-origin.

### C. Artefacts SW en Git
Choisir une strategie explicite:
1. Strategie A (recommandee): ne pas versionner `public/sw.js` et `public/workbox-*.js`.
2. Strategie B: versionner ces fichiers, mais imposer un controle strict en PR.

Important: une seule strategie pour toute l'equipe.

## Strategie QA
### Tests manuels obligatoires
1. Android Chrome:
- prompt install affiche une seule fois,
- installation reussie,
- relance depuis ecran d'accueil,
- parcours offline fallback.

2. iOS Safari:
- message guide "Ajouter a l'ecran d'accueil",
- lancement standalone,
- navigation offline degradee propre.

3. Regressions reseau:
- mode Slow 3G,
- mode Offline,
- retour Online,
- absence d'erreurs Workbox recurrentes en console.

### Tests automatises recommandes
- E2E Playwright:
  - verification presence manifest,
  - verification enregistrement SW,
  - check fallback offline route.

## Runbook incident PWA
### Symptomes
- Erreurs `no-response` Workbox en production.
- Donnees stale apres update.
- Scripts tiers non charges (ads/analytics).

### Procedure
1. Confirmer version du SW active (DevTools).
2. Identifier la route Workbox en faute (cacheName).
3. Appliquer hotfix de rule runtime caching.
4. Redeployer.
5. Forcer refresh client (message "nouvelle version").
6. Monitorer 24h les erreurs client.

## Gouvernance et ownership
- Owner technique: equipe frontend.
- Validation metier: produit.
- Validation production: QA + monitoring.

## KPIs de succes
- Taux install PWA.
- Taux d'ouverture app installee.
- Taux d'erreurs Workbox (`no-response`) < seuil cible.
- Temps de chargement sur reseau lent.
- Rebond en mode offline.

## Backlog priorise (prochaine iteration)
P0:
1. Unifier install prompt provider/hook.
2. Durcir runtime caching API privees.
3. Finaliser fallback offline `app/~offline/page.tsx`.

P1:
1. Banniere update SW.
2. Tracking evenements PWA.
3. Politique definitive artefacts SW en Git.

P2:
1. Tests E2E PWA complets.
2. Tableau de bord SLO PWA.

## Notes de migration
- Faire rollout progressif (staging -> preprod -> prod).
- Tester avec des comptes reels non admin.
- Documenter chaque modification de regles cache dans le changelog technique.

---
Derniere mise a jour: 2026-03-08
