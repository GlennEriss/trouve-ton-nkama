# Lot 9C - Recherche, profil et couverture a 40 %

Date : 2026-07-22

## Objectif

Porter la couverture globale de l'application au-dessus de 40 % sans reduire le
perimetre `collectCoverageFrom`, en ciblant la recherche IA, le profil, la localisation,
les credits et les principaux parcours d'authentification.

## Tests ajoutes

### Recherche IA et formulaires

- la route de chat IA couvre authentification, validation, extraction des criteres,
  Algolia, debit transactionnel, alternatives, credits insuffisants et erreurs Gemini ;
- le service de formulaire IA et tous les prompts immobiliers couvrent le JSON Gemini,
  la normalisation, les bornes et les onze types de biens ;
- le hook de recherche IA couvre session, resultats, filtres, credits, suggestions,
  suivi des clics et pannes reseau.

### Profil et authentification

- finalisation et modification du profil, reseaux sociaux annonceur, telephone verifie,
  verrouillage temporaire et erreurs de sauvegarde ;
- envoi et verification OTP, expiration, renvoi, mode local et session indisponible ;
- connexion par identifiants ou Google, erreurs URL/service et redirections ;
- demande de reinitialisation, limitation temporelle, erreur et confirmation d'envoi.

### Localisation et recherche

- cache de localisation 24 heures, navigateur, geocodage, Nominatim, Overpass et pannes ;
- import Photon des provinces, villes et quartiers avec poursuite sur erreur ;
- suggestions courtes, resultat canonique, remplissage du formulaire et synchronisation ;
- recherche Algolia desktop/mobile, filtres URL, tags, publicites, pagination et scroll ;
- selecteur cartographique GPS/Photon et edition manuelle du quartier ;
- multiselect partage en modes mobile et desktop.

### Credits et promotions

- historique, filtres, pagination, statuts et export CSV ;
- achat MyPayGa, detection operateur, validation telephone, succes, echec et annulation ;
- quatre offres de promotion, solde insuffisant, offre active et recharge.

## Regressions corrigees

Les tests ont revele puis verrouille deux defauts :

- effacer une recherche de localite refocalisait le champ trop tot et rouvrait la liste ;
- le badge mobile `+N nouvelles annonces` ne disparaissait jamais apres pagination.

## Resultats

Commande complete :

```bash
cd apps/location-maison
npm run test:ci
```

Resultat Jest : 92 suites passees, 1 ignoree, 577 tests passes et 6 ignores.

| Metrique | Apres 9B | Apres 9C | Progression |
| --- | ---: | ---: | ---: |
| Lignes | 31,02 % | 40,16 % (36 657 / 91 257) | +9,14 points |
| Instructions | 31,02 % | 40,16 % | +9,14 points |
| Fonctions | 43,49 % | 50,81 % (778 / 1 531) | +7,32 points |
| Branches | 58,51 % | 65,76 % (4 114 / 6 256) | +7,25 points |

Les 19 nouvelles suites representent 134 nouveaux cas passes et ajoutent 8 344 lignes
couvertes au rapport global.

## Gardes CI

Les seuils globaux de Jest et du controle independant sont maintenant :

- 40 % de lignes et instructions ;
- 50 % de fonctions ;
- 60 % de branches.

Des seuils locaux protegent egalement la route IA, les hooks IA/OTP, la recherche de
localite, le provider de localisation, la recherche mobile, le multiselect et l'achat
de credits. Le Lot 9D visera le palier final de 50 % de lignes et instructions.
