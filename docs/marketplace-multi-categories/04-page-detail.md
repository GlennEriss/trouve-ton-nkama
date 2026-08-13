# Page détail de l'annonce

## Aujourd'hui

Route `app/(public)/houseDetails/[id]/page.tsx` → composant
`components/preview-property/HouseDetails`. La page serveur construit les métadonnées SEO
(`generateMetadata`, `getPublicPropertyById`, `getPropertyLastModified`,
`buildListingShareTitle`) puis délègue le rendu.

C'est la couche la moins couplée des trois pages publiques : la structure (galerie, titre,
prix, localisation, contact, annonces similaires) est déjà proche de ce qu'il faut pour
n'importe quelle catégorie. L'essentiel du travail est de **remplacer le bloc de
caractéristiques immobilières par un bloc généré**.

## Décision : squelette commun + bloc d'attributs généré

| Bloc | Statut |
|---|---|
| Galerie d'images | Commun — ratio selon `imageRatio` de la catégorie |
| Titre, prix, fraîcheur | Commun |
| Localisation | **Conditionnel** selon `locationPrecision` : carte + adresse (immobilier), ville seule (mode), rien |
| **Caractéristiques** | **Généré depuis `attributeSchema`** — remplace surface/chambres/sdb |
| Description | Commun |
| Contact (WhatsApp / appel / contacts additionnels) | Commun, **inchangé** |
| Badges de confiance (Propriétaire direct, Numéro vérifié) | Commun, libellés portés par la catégorie |
| Favori, partage, signalement | Commun (favori = brique neuve) |
| Cadeaux, promotion | Commun, **inchangé** |
| Annonces similaires | Commun, **critère de similarité changé** |
| Réel associé | Commun |

### Bloc caractéristiques

Aujourd'hui : surface, chambres, salles de bain, type de bien, louer/vendre.
Demain : la liste des attributs de la catégorie, rendus selon leur type, dans l'ordre du
schéma, en masquant les valeurs absentes.

```
Immobilier          Vêtements           Parfums
─────────────       ─────────────       ─────────────
Type    Villa       Taille       M      Contenance  100 ml
Surface 180 m²      Marque    Zara      État        Neuf
Pièces  5           État  Très bon      Genre       Femme
Statut  À louer     Couleur   Noir      Type        Eau de parfum
```

### Annonces similaires

Le critère actuel est immobilier (même type de bien, même ville). Il devient : **même catégorie
feuille, fourchette de prix proche, même ville si `locationPrecision != none`**.

C'est un emplacement à fort rendement commercial : c'est là qu'une annonce promue doit
apparaître en priorité (voir [06-monetisation.md](./06-monetisation.md)).

## Le sujet sensible : les URLs

`/houseDetails/[id]` dit « maison » dans le chemin. Une annonce de parfum servie sous cette URL
est incohérente pour l'utilisateur, pour le partage WhatsApp et pour les moteurs.

**Ces URLs sont indexées et massivement partagées** — mois de partages sociaux, liens WhatsApp
envoyés par les annonceurs eux-mêmes, résultats de recherche. **Correction (Lot 6)** : les
réels n'en font PAS partie — leur lien de partage pointe vers `/reels/<reelId>`
(`getReelPublicUrl` dans `ReelsFeedClient.tsx`), jamais vers `/houseDetails`. Une affirmation
antérieure de ce document était fausse sur ce point ; les réels sont hors périmètre de cette
migration.

### Décision — ✅ fait (Lot 6, 2026-08-13)

1. Nouvelle route canonique : **`/annonce/[id]`** (`app/(public)/annonce/[id]/page.tsx`,
   contenu identique à l'ancienne page — la structured data reste `RealEstateListing` pour
   l'instant, la migration vers `Product`/`Offer` par catégorie est un chantier séparé, non
   fait ici).
2. **`/houseDetails/[id]` est conservée indéfiniment** — remplacée par une page de redirection
   pure (`permanentRedirect` de `next/navigation`, HTTP 308, équivalent SEO du 301), qui
   préserve aussi les query params (utile pour le lien `?share=true` des e-mails historiques).
   Ce n'est pas une étape de migration : c'est un alias permanent.
3. `canonical`/OG pointent sur la nouvelle URL ; le sitemap n'expose que la nouvelle
   (`app/sitemap.xml/route.ts`).
4. **Tous les producteurs de liens internes repris** (16 fichiers) : partage WhatsApp/Facebook
   de la fiche annonce (`ContactSection`, `ButtonShareToWhatsapp`, `ButtonShareToFacebook`,
   `PreviewPropertyMobile`), navigation carte/carrousel/recherche/favoris
   (`ListingCard`, `PropertyCarousel`, `PropertyDetailsPanel`, `MapPropertyCard`,
   `SectionFavoris`, `PropertyStatisticsClient`), e-mail `PropertyPublished`, tracking
   analytics (`tracker.service.ts`), redirections de propriété (`(protected)/property/[id]`,
   `create/preview/[id]`, `PreviewPropertyClient`). Un lien oublié n'aurait pas été cassé (la
   redirection l'aurait rattrapé) mais aurait dilué le signal — recensement fait par grep
   exhaustif du littéral `houseDetails`, pas par relecture partielle.

**Point d'attention** : ce changement est le seul du chantier qui soit difficilement
réversible. Il doit être fait en une fois, vérifié, et pas mélangé à d'autres modifications
dans le même déploiement.

### Slug

Envisager `/annonce/[slug]-[id]` (`/annonce/robe-zara-taille-m-a3f9`) pour la lisibilité et le
SEO. Recommandation : **oui, mais dans un lot ultérieur** — l'id seul suffit pour ouvrir la
catégorie, et empiler deux changements d'URL dans le même chantier double le risque.

## Métadonnées et partage

`generateMetadata` produit aujourd'hui un titre orienté immobilier. Le gabarit doit devenir
dépendant de la catégorie (modèle de titre porté par `listing_categories`), avec repli sur un
format générique `{titre} — {prix} F CFA · {ville} | Trouve Ton Nkama`.

Les données structurées passent de `RealEstateListing` à `Product` / `Offer` pour les
catégories de biens matériels — c'est ce qui conditionne l'éligibilité aux résultats enrichis
Google, donc à du trafic gratuit sur la mode.

## Points ouverts

1. **Faut-il afficher le nombre de vues et de favoris publiquement ?** Ça crée de la preuve
   sociale, mais expose la faiblesse d'audience d'une catégorie neuve. Recommandation :
   visible pour l'annonceur seulement au lancement ; public quand le volume le permet.
2. **Guide des tailles / mesures pour les vêtements** : utile mais hors périmètre. À noter comme
   piste V1.
3. **Signalement d'annonce** : le motif de signalement doit-il dépendre de la catégorie
   (contrefaçon pour la mode, arnaque à la caution pour l'immobilier) ? Recommandation : oui,
   liste de motifs portée par la catégorie.
