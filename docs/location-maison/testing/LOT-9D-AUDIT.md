# Lot 9D - Seuil global de couverture a 50 %

Date d'execution : 2026-07-22

## Objectif

Porter les lignes et instructions Jest de l'application au seuil final de 50 %, sans
regression des branches et fonctions, puis rendre ce palier obligatoire dans la CI.

## Perimetre teste

- composants des trois etapes du formulaire immobilier et publication visiteur ;
- assistants IA, recherche IA, suggestions contextuelles et hook Gemini ;
- inscription mobile et historique, confirmation et echec de reinitialisation ;
- profil, roles annonceur, authentification NextAuth et activites de compte ;
- cadeaux, retraits Mobile Money, campagnes publicitaires et analytics administratifs ;
- routes analytics, campagnes annonceur, SEO Algolia et projection OSM serveur ;
- pied de page, contacts, PWA, publicite AdSense et regles de visibilite mobile.

Les tests exercent les succes, erreurs metier, pannes reseau, etats de chargement,
temporisations, validations, deduplications et doubles actions pertinents.

## Resultat

| Metrique | Resultat | Seuil CI |
| --- | ---: | ---: |
| Lignes | 50,04 % (45 193 / 90 306) | 50 % |
| Instructions | 50,04 % (45 193 / 90 306) | 50 % |
| Fonctions | 59,43 % (1 065 / 1 792) | 50 % |
| Branches | 70,56 % (5 718 / 8 103) | 60 % |

- 116 suites passees et 1 suite ignoree ;
- 810 tests passes et 6 tests ignores ;
- seuil global Jest et controle `check-location-maison-coverage.cjs` fixes a 50 % pour
  les lignes et instructions.

## Perimetre de couverture

Deux familles absentes du produit livre sont exclues explicitement :

- `src/app/**/test-*` : pages et routes de diagnostic manuel ;
- `src/mocks/**` : jeux de donnees de demonstration.

Les pages applicatives, composants, hooks, services, routes API, acces aux donnees et
regles metier restent instrumentes. Ces exclusions retirent du denominateur des outils de
test, pas du code de production choisi parce qu'il serait difficile a couvrir.

## Verification

```bash
npm run test:ci
npm run check:types
npm run build
```

Le rapport machine est genere dans
`apps/location-maison/__tests__/coverage/coverage-summary.json` et le rapport navigable
dans `apps/location-maison/__tests__/coverage/lcov-report/`.
