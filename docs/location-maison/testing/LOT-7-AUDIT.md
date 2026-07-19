# Lot 7 - Extension de couverture et seuils CI

Date d'execution : 2026-07-19.

## Objectif

Etendre la couverture automatisee au-dela des parcours deja valides par les lots 1 a 6,
en priorisant les risques financiers, les ecritures Firestore, les reels et les formulaires.
Le lot distingue la couverture globale historique de la couverture exigee sur les modules
critiques. Une moyenne globale ne doit pas masquer une regression locale.

## Lot 7A - Cloud Functions critiques

33 tests ajoutes sur les paiements cadeaux et les recharges MyPayGa :

- validation HTTP, cible reel/annonce exclusive et montants autorises ;
- validation et normalisation des numeros Airtel/Moov ;
- plafond anti-spam des paiements cadeaux en attente ;
- creation des transactions et calcul de la commission cadeau ;
- refus fournisseur, panne reseau et configuration incomplete ;
- signature HMAC, alteration de montant et transaction inconnue ;
- attribution atomique des credits/cadeaux et rejeu idempotent ;
- notification cadeau envoyee une seule fois.

Une incoherence a ete corrigee pendant les tests : la recharge MyPayGa convertit maintenant
`+241077123456` en `077123456`, comme le flux cadeau, avant l'envoi au fournisseur.

Resultat Functions : 75 tests passes, 5 ignores. La couverture globale passe de 16,38 %
a 36,62 % des lignes et de 17,09 % a 36,66 % des branches.

## Lot 7B - Metier, API et donnees

34 tests ajoutes sur `credit-transaction.db.ts` et `reel.db.ts` :

- historique pagine, curseur, filtre et compatibilite des anciennes transactions ;
- creation, statut, comptage, lecture et statistiques des credits ;
- depense negative et debit atomique avec refus du solde insuffisant ;
- authentification des operations reel et messages API ;
- creation, rattachement, modification, suppression et echec d'upload ;
- pagination proprietaire et filtrage des reels publics ;
- upload Storage, metadonnees et traduction des erreurs ;
- abonnement Firestore et nettoyage de la souscription.

L'atomicite reelle et la concurrence restent egalement couvertes par Firestore Emulator
(lots 4E, 6A et 6C) : les tests unitaires de ce lot ne les remplacent pas.

## Lot 7C - Composants, hooks et formulaires

19 tests ajoutes :

- indicatif `+241` separe, suppression du premier zero et longueur nationale ;
- formulaire IA : images conservees, plafond de fichiers, champs appliques et erreurs Gemini ;
- paiement cadeau : initiation, polling, succes, refus, panne reseau et annulation ;
- creation de reel : retour securise, visiteur sans ecriture, erreur Storage ;
- double clic sur Publier limite a une creation et un upload.

## Lot 7D - Couverture et CI

La CI execute desormais deux niveaux de seuils :

1. Les seuils globaux Jest empechent une baisse generale.
2. `scripts/check-location-maison-coverage.cjs` controle les modules critiques
   individuellement a partir de `coverage-summary.json`.

Les resumes de couverture application et Functions sont ajoutes a `GITHUB_STEP_SUMMARY`.
Les rapports LCOV/HTML/JSON restent publies comme artefacts pendant 14 jours.

### Baselines CI

| Perimetre | Lignes | Branches | Fonctions | Instructions |
| --- | ---: | ---: | ---: | ---: |
| Application globale | 10 % | 45 % | 22 % | 10 % |
| Functions globales | 35 % | 35 % | 25 % | 35 % |

### Couverture des modules critiques

| Module | Lignes mesurees | Branches mesurees | Seuil lignes |
| --- | ---: | ---: | ---: |
| Transactions de credits | 98,24 % | 72,30 % | 95 % |
| Client reels | 92,56 % | 62,26 % | 90 % |
| Hook paiement cadeau | 94,64 % | 68,00 % | 90 % |
| Hook formulaire IA | 100 % | 80,00 % | 95 % |
| Creation de reel | 91,50 % | 68,60 % | 85 % |
| Champ telephone separe | 77,37 % | 62,50 % | 75 % |
| Initiation cadeau Function | 92,47 % | 83,48 % | 90 % |
| Webhook cadeau Function | 86,86 % | 67,52 % | 85 % |
| Initiation credits MyPayGa | 96,42 % | 78,18 % | 90 % |
| Webhook credits MyPayGa | 84,50 % | 61,33 % | 80 % |

## Commandes

```bash
cd apps/location-maison
npm run check:types
npm run test:ci

cd functions
npm run build
npm run test:ci
```

Les seuils seuls peuvent etre verifies a partir des derniers rapports avec :

```bash
cd apps/location-maison && npm run check:coverage
cd apps/location-maison/functions && npm run check:coverage
```

## Interpretation du 70-80 %

La cible 70-80 % est atteinte ou depassee sur les lignes des circuits modifies dans ce lot.
La couverture globale application reste a 10,92 % car `collectCoverageFrom` compte environ
90 000 lignes, dont de nombreuses pages et composants historiques jamais charges par Jest.
Atteindre 70 % globalement demande une campagne separee par domaines (annonces, recherche,
profil, administration, pages editoriales), sans abaisser ni exclure artificiellement le
denominateur.
