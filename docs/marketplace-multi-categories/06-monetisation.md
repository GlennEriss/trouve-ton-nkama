# Monétisation de la catégorie mode

Principe directeur : **l'objectif n'est pas de faire du gratuit.** La gratuité éventuelle du
lancement est un investissement d'amorçage borné dans le temps, décidé et annoncé comme tel —
pas un modèle par défaut qu'on essaiera de rattraper plus tard.

## Ce qui existe déjà et qu'on réutilise

| Brique | État |
|---|---|
| Wallet de crédits + recharge Mobile Money (MyPayGa, Airtel) | En production |
| Promotions d'annonce débitées en crédits (`/api/property/promote`) | En production |
| Facturation directe en FCFA sans crédits (demandes de recherche : 500 F de base, +1 500 F de boost) | En production |
| Cadeaux sur réels — argent réel, **15 % de commission** + frais de retrait | En production |
| Régie publicitaire first-party (`SponsoredSlot`, module `advertising`) + AdSense en repli | En production |
| Packs de crédits pilotés depuis l'admin (collection `credit_packs`) | En production |

Aucun nouveau moyen de paiement, aucun nouveau prestataire, aucune nouvelle mécanique
financière n'est nécessaire pour monétiser la mode. **Tout est déjà là** — c'est la principale
raison pour laquelle ce chantier est rentable.

Point important : la facturation des demandes de recherche prouve que **facturer un acte de
publication est déjà accepté** dans le produit et par les utilisateurs. La mode n'introduit pas
un principe nouveau.

## Le vrai problème : l'échelle de prix

Grille de promotion actuelle (`app/api/property/promote/route.ts`) :

| Service | Crédits | Durée |
|---|---|---|
| Mise à la une (`featured`) | 15 | 7 j |
| Mise en tendance 7 j | 10 | 7 j |
| Mise en tendance 3 j | 5 | 3 j |
| Boost | 3 | — |

Rapportée à un article de mode à 15 000 F (au repère de 100 F le crédit — la valeur réelle est
pilotée par les packs en base, à confirmer) :

| Service | Coût | Part du prix de l'article | Verdict |
|---|---|---|---|
| Boost | ~300 F | 2 % | **Fonctionne tel quel** |
| Tendance 3 j | ~500 F | 3,3 % | **Fonctionne tel quel** |
| Tendance 7 j | ~1 000 F | 6,7 % | Limite |
| Mise à la une | ~1 500 F | 10 % | **Ne passera pas** |

Correction d'une idée reçue : la grille de promotion n'est **pas** globalement inadaptée à la
mode. Le bas de gamme fonctionne déjà. Seul le haut de gamme est calibré pour l'immobilier, où
1 500 F face à un loyer de 250 000 F est indolore.

**Décision** : `promotionPricing` porté par `listing_categories`, permettant de redéfinir la
grille par catégorie sans redéploiement. Repère de calibrage : **une promotion doit coûter
entre 2 % et 5 % du prix de l'article**.

## Les leviers, classés par pertinence pour la mode

### 1. Quota d'annonces gratuites + annonces supplémentaires payantes — **le levier principal**

C'est la différence structurelle entre la mode et l'immobilier : un annonceur immobilier a 1 à
5 biens ; un vendeur de vêtements en a 30 à 200 et en rentre chaque semaine.

Ce n'est donc pas la *promotion* qui monétise la mode, c'est le **volume de publication**.

Proposition :

- **3 annonces actives gratuites** par compte, toutes catégories confondues.
- Au-delà : facturation à l'unité, soit en crédits, soit en FCFA direct (le précédent des
  demandes de recherche montre que les deux voies existent).
- Le quota compte les annonces **actives**, pas cumulées : archiver libère un emplacement.
  C'est ce qui rend le quota acceptable — le vendeur occasionnel ne paie jamais, le vendeur
  professionnel paie proportionnellement à son activité.
- Repère de départ : **200 F par annonce active supplémentaire et par mois**, ou l'équivalent
  en crédits.

### 2. Abonnement vendeur — la boutique revient par la fenêtre, sans la construire

Le système de boutique a été écarté. Sa fonction économique, elle, reste valable : un vendeur
en volume veut un forfait prévisible, pas une facturation à l'unité.

Proposition : un abonnement mensuel qui inclut un **quota d'annonces élevé**, un **badge
vendeur**, et un **crédit de promotions mensuel**. Aucune page vitrine, aucune gestion de
stock, aucun panier — donc aucune dérive e-commerce.

À positionner **après** le quota, une fois qu'on sait combien de comptes dépassent la limite
gratuite : c'est cette mesure qui donne le prix de l'abonnement.

### 3. Publicité — le levier immédiat, déjà construit

La mode attire des annonceurs locaux (boutiques, instituts, salons) que l'immobilier
n'intéresse pas. Le module `advertising` (mode concierge + self-serve en crédits) et
`SponsoredSlot` fonctionnent déjà et sont agnostiques de la catégorie.

Un emplacement sponsorisé dans le fil de recherche mode et dans les « annonces similaires » de
la fiche produit du revenu **sans construire quoi que ce soit**, dès l'ouverture de la
catégorie. C'est le seul levier qui rapporte avant même que les vendeurs ne paient.

### 4. Cadeaux sur réels — la synergie sous-estimée

Les cadeaux sont déjà en production avec 15 % de commission, et les réels sont déjà découplés
de l'immobilier. Or la mode produit du contenu vidéo bien plus facilement que l'immobilier
(essayage, arrivage, déballage), et ces vendeurs en tournent **déjà** pour WhatsApp et
Facebook.

Chaque réel mode qui arrive est une source de commission à coût de développement quasi nul.
Voir [05-publication-et-reels.md](./05-publication-et-reels.md).

### 5. Promotions à l'annonce — utile, mais pas la machine

Elles fonctionnent (voir grille ci-dessus) et doivent être proposées, mais sur des articles peu
chers elles génèrent des tickets faibles. Elles complètent le quota, elles ne le remplacent
pas.

## Ce qu'on ne fait pas

- **Pas de commission sur la vente.** La plateforme ne touche jamais l'argent de la
  transaction : pas de séquestre, pas de reversement, pas de litige de fonds à arbitrer. Le
  modèle reste la mise en relation.
- **Pas de boutique / vitrine payante.** Écarté, voir README.
- **Pas de paiement acheteur.** L'accès à la recherche et au contact reste gratuit : la demande
  gratuite est ce qui attire les vendeurs, qui sont les payeurs.

## Séquence d'activation

| Phase | Durée indicative | Monétisation active |
|---|---|---|
| Amorçage | 6 à 8 semaines après ouverture | Publicité uniquement. Publication gratuite, **quota annoncé dès le premier jour** comme « gratuit jusqu'au [date] » |
| Activation | à partir du seuil de stock | Quota + annonces supplémentaires payantes, promotions retarifées |
| Consolidation | quand N comptes dépassent le quota | Abonnement vendeur, calibré sur les données réelles |

**Point d'attention** : annoncer le quota dès le début. Introduire une limite sur un service
présenté comme gratuit produit un sentiment de trahison qui coûte plus cher que les revenus
gagnés. « Gratuit pendant le lancement » et « gratuit » ne sont pas la même promesse, et la
différence doit être écrite dans l'interface, pas seulement dans les CGU.

## Ce qu'il faut mesurer pour décider

Sans ces chiffres, le prix de l'abonnement et le niveau du quota seront des paris :

1. Nombre de comptes ayant **plus de 3 annonces mode actives** (la future base payante).
2. Distribution du **prix des articles** publiés (calibre la grille de promotion).
3. **Taux de clic contact** (WhatsApp/appel) par annonce mode vs immobilier — c'est la valeur
   réellement délivrée au vendeur, donc ce qu'il accepte de payer.
4. Nombre de **favoris par annonce** — la preuve à montrer au vendeur pour justifier une
   promotion.
5. Revenu publicitaire par mille affichages sur les pages mode.

Les points 1, 3 et 4 doivent être instrumentés **dans le lot qui ouvre la catégorie**, pas
après. Sans eux, la phase d'activation sera arbitraire.

## Points ouverts

1. **Crédits ou FCFA direct pour les annonces supplémentaires ?** Les crédits ont l'avantage de
   la recharge groupée (moins de frais Mobile Money) ; le FCFA direct est plus lisible.
   Recommandation : **crédits**, cohérent avec les promotions, et les frais Mobile Money sont
   amortis sur la recharge.
2. **Le quota est-il global ou par catégorie ?** Un quota global de 3 pénaliserait un annonceur
   immobilier existant qui a déjà 3 biens. Recommandation : **quota par catégorie**, pour ne
   pas modifier rétroactivement les conditions des annonceurs immobiliers actuels.
3. **Valeur réelle du crédit** : `CREDIT_PACKS` est déprécié au profit de la collection
   Firestore `credit_packs`. Le repère de 100 F utilisé ici doit être confirmé sur les packs
   réellement en vente avant tout calibrage définitif.
