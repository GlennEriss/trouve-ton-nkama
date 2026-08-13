# Marketplace multi-catégories

Jeu de documents de conception pour l'ouverture de Trouve Ton Nkama à d'autres catégories
d'annonces que l'immobilier — en commençant par **Mode** (vêtements, chaussures, parfums &
beauté, accessoires), avec **Véhicules** comme catégorie suivante prévue.

Phase actuelle : **documentation uniquement**. Aucune implémentation n'est lancée tant que ce
jeu n'est pas arbitré.

## Comment lire

| Doc | Question à laquelle il répond |
|---|---|
| [00-le-vrai-probleme.md](./00-le-vrai-probleme.md) | Pourquoi « ajouter une catégorie » n'est pas un petit chantier — inventaire du couplage immobilier, couche par couche |
| [01-direction-artistique.md](./01-direction-artistique.md) | À quoi ressemble le produit après — densité, carte d'annonce universelle, favoris |
| [02-page-accueil.md](./02-page-accueil.md) | Comment l'accueil passe d'une page immobilière à un annuaire de catégories |
| [03-page-recherche.md](./03-page-recherche.md) | Le point dur : une recherche qui sert l'immobilier **et** la mode |
| [04-page-detail.md](./04-page-detail.md) | Fiche annonce générique, sans casser le SEO existant |
| [05-publication-et-reels.md](./05-publication-et-reels.md) | Sortir des 14 form builders ; ce que deviennent les réels |
| [06-monetisation.md](./06-monetisation.md) | Comment cette catégorie gagne de l'argent — l'objectif n'est pas de faire du gratuit |
| [07-lots-et-sequencement.md](./07-lots-et-sequencement.md) | L'ordre de bataille, avec critère de sortie par lot |

## Décisions déjà prises (hors de ces documents)

- **Approche par catégorie générique**, pas un ajout spécifique « mode ». Le modèle doit
  absorber Véhicules et les suivantes sans redéploiement.
- **Pas de système de boutique.** Écarté : il tire vers l'e-commerce (stock, panier, livraison)
  alors que le produit reste de la **mise en relation** (WhatsApp / appel). La monétisation des
  vendeurs en volume passe par le quota et l'abonnement, pas par une vitrine — voir
  [06-monetisation.md](./06-monetisation.md).
- **Catégories pilotées par l'admin** : collection `listing_categories`, drapeau `isActive` pour
  choisir ce qui est publié, schéma d'attributs par catégorie.
- **Arbre de départ** : `Immobilier` (racine, existant) + `Mode` → Vêtements, Chaussures,
  Parfums & beauté, Accessoires.

## Ce que ces documents ne couvrent pas

- L'import Apify / social import, spécifique à l'immobilier — hors périmètre.
- La refonte du SEO `/immobilier/...` — il est conservé tel quel.
- La migration des 14 builders immobiliers vers le moteur générique — prévue **après**
  validation du moteur sur les nouvelles catégories, pas pendant.
