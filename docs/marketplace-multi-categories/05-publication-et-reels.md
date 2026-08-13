# Publication et réels

## Partie 1 — Le formulaire de publication

### Aujourd'hui : 14 builders

`src/builders/property-form/` contient un builder par type de bien :

```
apartment  building  desk    duplex    home   kiosk  land
logement   property  room    shop      studio villa  warehouse
```

Chacun dérive de la classe abstraite `PropertyFormBuilder` et compose une liste de
`FormElement` (`{ name, label, description, component, step }`) répartis sur les étapes du
stepper. Chaque builder a son composant miroir : `components/home/FormHome.tsx`,
`components/villa/FormVilla.tsx`, `components/land/FormLand.tsx`, etc. Les champs eux-mêmes
viennent de `components/stepper/step1.components.tsx` et `step3.components.tsx`
(`TitleComponent`, `PriceComponent`, `AreaComponent`, `TagsComponent`, `ContactComponent`,
`LocationPicker`…).

### Pourquoi ça ne peut pas continuer

Le pattern impose : **un type d'annonce = un fichier builder + un composant formulaire**.

- Mode seule : +4 couples (vêtements, chaussures, parfums, accessoires)
- Véhicules : +3
- Chaque nouvelle catégorie : autant de code à écrire, tester, maintenir

Et surtout : ces 14 builders ne diffèrent **que par la liste des champs affichés**. C'est de la
donnée exprimée en code. La conséquence pratique est que l'ouverture d'une catégorie devient un
développement au lieu d'être une opération d'administration — ce qui contredit directement
l'objectif « englober plusieurs catégories ».

### Décision : un moteur de formulaire piloté par le schéma

Un seul composant de publication, qui lit `attributeSchema` de la catégorie choisie et rend les
champs correspondants.

```
Étape 1  Catégorie        → arbre des catégories actives (Mode › Vêtements)
Étape 2  Photos           → nombre max et ratio portés par la catégorie
Étape 3  Infos communes   → titre, description, prix, prix négociable
Étape 4  Caractéristiques → GÉNÉRÉ depuis attributeSchema
Étape 5  Localisation     → CONDITIONNELLE selon locationPrecision
Étape 6  Contact          → WhatsApp / appel / contacts additionnels (inchangé)
Étape 7  Aperçu           → rendu avec la ListingCard réelle, puis envoi en modération
```

Les composants de champ existants (`InputForm`, `SelectForm`, `CheckboxForm`,
`PhoneNumberForm`, `LocationPicker`) sont **réutilisés tels quels** : le moteur les câble, il ne
les réécrit pas. Ce qui disparaît, c'est la couche builder, pas la couche champ.

La validation devient dynamique : un schéma Zod construit à l'exécution à partir de
`attributeSchema` (types, `required`, options d'énumération, bornes numériques), appliqué
**côté client et côté serveur** — la validation serveur ne doit pas être dérivée d'une autre
source que le schéma de la catégorie, sinon les deux divergeront.

### Localisation : le champ qui bloque tout

Aujourd'hui `Location` impose `street`, `province`, `longitude`, `latitude`. Un vendeur de
parfum n'a pas d'adresse à donner, et lui en demander une est un motif d'abandon immédiat.

`locationPrecision` sur la catégorie :

| Valeur | Effet | Catégorie |
|---|---|---|
| `exact` | Adresse + carte + coordonnées, obligatoire | Immobilier |
| `city` | Ville seule, obligatoire | Mode, Véhicules |
| `none` | Aucun champ | (réservé) |

### Migration : ne pas toucher aux 14 builders maintenant

**Le moteur générique sert d'abord les nouvelles catégories. L'immobilier garde ses builders.**

Les deux cohabitent : le stepper choisit le moteur en fonction de la catégorie sélectionnée.
Quand le moteur aura fait ses preuves sur la mode et les véhicules — c'est-à-dire quand il aura
encaissé de vraies annonces et de vrais retours de modération — on rapatrie l'immobilier et on
supprime les 14 builders.

Réécrire d'abord le parcours de publication immobilier, qui fonctionne et qui porte le chiffre
d'affaires actuel, pour une catégorie qui n'a pas encore un seul utilisateur, serait prendre le
risque au mauvais endroit.

### Et l'amorçage ?

Le formulaire public **n'est pas sur le chemin critique du lancement de la mode**. L'offre
immobilière actuelle est majoritairement saisie par l'admin (back-office, import). La même voie
permet de constituer le stock mode initial sans attendre le moteur de formulaire.

Ce point est ce qui permet de repousser le chantier le plus coûteux au lot 7 — voir
[07-lots-et-sequencement.md](./07-lots-et-sequencement.md).

## Partie 2 — Les réels

### Bonne nouvelle : ils sont déjà découplés

`models/reel.d.ts` :

```ts
// Optionnel : un réel peut être créé sans annonce existante
propertyId?: string | null;
contact?: string;      // numéro propre au réel
description?: string;  // texte libre
moderationStatus: ModerationStatus;
```

Avec `CreateOrphanReelClient` (réel sans annonce) et `attachReelToProperty` (rattachement
ultérieur), la brique réels est **la seule couche du produit qui n'est pas couplée à
l'immobilier**. Le feed, le trim vidéo, le transcodage, la modération, les cadeaux et les
statistiques fonctionnent sans modification de fond.

### Ce qu'il manque

1. **Un axe catégorie** : `categoryPath` sur le réel (hérité de l'annonce liée, ou choisi à la
   création d'un réel orphelin), pour filtrer le feed.
2. **Des onglets de feed** : « Tout · Immobilier · Mode ». Sans ça, un utilisateur venu pour la
   mode reçoit des visites d'appartement et se retire.
3. **Le lien de partage** doit suivre la nouvelle route `/annonce/[id]` (voir
   [04-page-detail.md](./04-page-detail.md)).

### Pourquoi c'est un levier plus fort qu'il n'y paraît

La mode est **le contenu vidéo natif** : essayage, déballage, arrivage. Là où un réel
immobilier demande une préparation (visite filmée, éclairage), un réel mode se tourne en trente
secondes avec un téléphone, et les vendeurs de vêtements en produisent **déjà** pour WhatsApp
et Facebook.

Autrement dit : la catégorie mode alimente le feed réels bien plus facilement que l'immobilier,
et le feed réels est déjà branché sur les cadeaux — donc sur une source de revenu réelle (15 %
de commission, modèle déjà en production). C'est la synergie la plus rentable du chantier, pour
un coût de développement faible.

**Recommandation** : traiter les réels catégorisés non pas comme un lot final « si on a le
temps », mais comme le levier d'acquisition de la catégorie mode. Le coût est faible, l'effet
est de premier ordre.

## Points ouverts

1. **Un réel mode doit-il obligatoirement être rattaché à une annonce ?** Le rattachement rend
   le réel monétisable (clic vers la fiche, promotion) ; l'orphelin est plus facile à produire.
   Recommandation : orphelin autorisé, mais incitation forte au rattachement.
2. **Modération vidéo** : le volume de réels mode sera supérieur au volume immobilier. La
   modération manuelle actuelle tiendra-t-elle ? À chiffrer avant l'ouverture du feed mode.
3. **Le stepper actuel doit-il être conservé** (parcours en étapes) ou passer à un formulaire
   d'une seule page pour les catégories à peu de champs ? Un vêtement a 4 champs : sept étapes
   pour ça est disproportionné. Recommandation : nombre d'étapes adaptatif selon la taille du
   schéma.
