# Page d'accueil

## Aujourd'hui

`HomePageDesktopComponent` / `HomePageMobileComponent` enchaînent :

`Navbar` → hero + `HomeHeroSponsoredSwap` → `FeaturedSection` → bloc éditorial →
`CarouselPropertyType` → `TrendingSection` → `RecentSection` → `PropertyByProvince` → liens SEO
`/immobilier/...`

Les sections sont organisées selon **deux axes, tous deux immobiliers** :

- **le type de bien** (`HOME_PROPERTY_TYPE_KEYS` : Home, Studio, Apartment, Building, Desk,
  Room, Kiosk, Shop, Land) ;
- **la province** (`HOME_PROVINCES`, avec visuel par province).

Et deux sections transverses par **fraîcheur/popularité** (`TrendingSection`, `RecentSection`)
qui, elles, survivent au changement de périmètre.

## Le problème

Ajouter « Mode » comme une section de plus dans cette page produirait une page immobilière avec
une pièce rapportée. L'utilisateur qui arrive doit comprendre en une seconde que le site n'est
plus seulement immobilier — sinon la catégorie mode ne recevra jamais de trafic, quel que soit
le travail fait en dessous.

Symétriquement, l'accueil ne doit pas **dégrader** l'immobilier, qui reste le vertical qui
apporte le trafic et le référencement.

## Décision : l'accueil devient un annuaire de catégories

L'axe principal de l'accueil passe de « type de bien » à **« catégorie »**. L'immobilier
devient la première catégorie, mise en avant, pas le sujet implicite de la page.

### Structure cible

| Bloc | Contenu | Piloté par |
|---|---|---|
| 1. Hero + recherche universelle | Une barre unique, avec sélecteur de catégorie (« Tout », Immobilier, Mode…) | `listing_categories` actives |
| 2. Rail de catégories | Icône + libellé pour chaque catégorie racine active, lien vers `/c/<slug>` | `order`, `isActive`, `icon` |
| 3. Sponsorisé | `HomeHeroSponsoredSwap` / `SponsoredSlot` — **inchangé** | module `advertising` |
| 4. Section Immobilier | Titre + « Voir tout » + rail horizontal de cartes `showcase` | catégorie |
| 5. Section Mode | Idem, densité `compact` | catégorie |
| 6. Sections suivantes | Une par catégorie racine active, dans l'ordre `order` | catégorie |
| 7. Tendances | `TrendingSection`, **transverse toutes catégories** | existant, à généraliser |
| 8. Récentes | `RecentSection`, transverse | existant, à généraliser |
| 9. Par province | `PropertyByProvince`, **conservé mais restreint à l'immobilier** | existant |
| 10. Liens SEO | Liens `/immobilier/...` existants, **inchangés** | existant |

`CarouselPropertyType` (types de bien) descend à l'intérieur de la section Immobilier ou de la
page catégorie `/c/immobilier` : c'est un axe de sous-catégorie, plus un axe d'accueil.

### Pourquoi une section par catégorie plutôt qu'un flux mélangé

Un flux unique mélangeant une villa à 45 millions et une paire de sneakers à 15 000 F ne
raconte rien et rend le prix illisible. La section par catégorie donne à chaque univers son
échelle de prix, sa densité de carte et son ratio d'image — c'est ce qui permet à une seule
page de servir deux marchés sans que l'un abîme l'autre.

## La règle qui évite l'effet « marketplace morte »

Une catégorie fraîchement ouverte contient peu d'annonces. Une section « Mode » affichant trois
articles fait plus de dégâts qu'une absence de section : elle signale que personne n'utilise le
site.

**Règle : une section de catégorie ne s'affiche que si la catégorie compte au moins
`minListingsForHomeSection` annonces actives** (valeur portée par la catégorie, pilotée depuis
l'admin ; repère de départ : 12, soit deux lignes pleines).

Corollaire de séquencement : **on constitue le stock d'annonces mode avant d'exposer la section
sur l'accueil**, pas l'inverse. Voir [07-lots-et-sequencement.md](./07-lots-et-sequencement.md).

## Point d'attention performance

Une section par catégorie = une requête de listing par section. Avec 4 catégories plus
tendances et récentes, on passe à 6+ requêtes pour peindre l'accueil — sur une audience
majoritairement mobile en data chère.

**À faire dès la conception** : une seule requête groupée Algolia (`multiple queries` en un
aller-retour) plutôt qu'une requête par section, et rendu serveur/ISR de l'accueil comme
aujourd'hui. Ne pas laisser chaque composant de section déclencher son propre appel client.

## Impact SEO

L'accueil est une page indexée qui classe aujourd'hui sur des requêtes immobilières. Deux
garde-fous :

- Les liens SEO `/immobilier/...` en bas de page et le maillage existant **restent en place et
  au même endroit**.
- La section Immobilier reste **la première** section de contenu. Reléguer l'immobilier plus bas
  pour faire de la place à la mode est le moyen le plus rapide de perdre le trafic qui finance
  l'opération.

## Points ouverts

1. **Le hero doit-il rester une image immobilière ?** Une image de logement en pleine largeur
   contredit le message « on n'est plus que de l'immobilier ». Alternative : hero neutre centré
   sur la recherche. À trancher sur maquette.
2. **Nommage des routes catégories** : `/c/<slug>` (court, neutre) ou `/<slug>` (`/mode`,
   `/immobilier`) ? La seconde est meilleure pour le SEO mais entre en collision avec le
   namespace `/immobilier/...` déjà utilisé pour les pages de recherche SEO. Recommandation :
   `/c/<slug>`, et on garde `/immobilier/...` intact.
3. **Faut-il une bascule d'accueil mémorisée** (« vous consultez surtout la mode ») ? Reporté :
   personnalisation prématurée tant que le volume est faible.
