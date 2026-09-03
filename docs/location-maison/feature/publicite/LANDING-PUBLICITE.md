# Landing page publique — `/publicite`

> Statut : spécification produit, UX, contenu et SEO à implémenter.
>
> Cette page ne remplace pas `/advertising`. Elle explique l'offre avant de
> demander à la personne de créer un compte.

## 1. Décision produit

Créer une page publique accessible à l'adresse :

`https://tonnkama.com/publicite`

La page doit permettre à une personne qui ne connaît ni Trouve Ton Nkama ni le
système de crédits de comprendre, en moins de 10 secondes :

1. ce qui est vendu ;
2. à qui la publicité sera montrée ;
3. où elle apparaîtra ;
4. combien coûte le premier forfait en FCFA ;
5. comment démarrer une campagne.

### Promesse principale

> Faites connaître votre activité auprès d'un public au Gabon, à partir de
> 3 750 FCFA.

### Explication courte

Trouve Ton Nkama Publicité permet à une entreprise, un commerce, un indépendant,
une association ou un organisateur d'événement de diffuser une image ou une
vidéo sur Trouve Ton Nkama. La publicité peut mener directement vers WhatsApp,
un numéro de téléphone ou un site web. L'annonceur peut ensuite suivre les vues
et les clics de sa campagne.

Le mot **crédit ne doit pas être utilisé comme argument commercial** sur cette
page. Les prix sont affichés en FCFA. Si les crédits restent le moyen de paiement
technique dans l'espace connecté, ils ne sont expliqués qu'au moment du paiement,
avec l'équivalent FCFA toujours visible.

## 2. Différence entre les routes

| Route | Accès | Rôle |
|---|---|---|
| `/publicite` | Public, sans connexion | Découvrir et comprendre l'offre, voir les formats et les prix, regarder la vidéo |
| `/advertising` | Compte connecté | Consulter ses campagnes et leurs résultats |
| `/advertising/create` | Compte connecté | Créer et payer une nouvelle campagne |

Le middleware ne doit jamais rediriger `/publicite` vers la connexion. La page
doit être rendue côté serveur autant que possible, indexable et utilisable même
si l'utilisateur n'est pas authentifié.

### Comportement du bouton principal

- Visiteur connecté : **Créer ma publicité** ouvre `/advertising/create`.
- Visiteur non connecté : le même bouton ouvre la connexion ou l'inscription,
  avec un paramètre de retour vers `/advertising/create` après authentification.
- Bouton secondaire : **Voir comment ça marche** descend vers la vidéo.

La page publique doit rester consultable intégralement avant toute demande de
connexion. Ne pas afficher d'état de tableau de bord, de solde à zéro ou de
message d'erreur de campagne sur cette landing page.

## 3. Structure et contenu de la page

### 3.1 En-tête

- Logo Trouve Ton Nkama renvoyant vers l'accueil.
- Liens d'ancrage : `Comment ça marche`, `Emplacements`, `Tarifs`, `FAQ`.
- Action discrète : `Se connecter`.
- Action principale : `Créer ma publicité`.
- Sur mobile, garder une navigation courte et un bouton d'action visible sans
  provoquer de défilement horizontal.

### 3.2 Hero — réponse immédiate

**Badge :** `La publicité locale, simple et abordable`

**H1 :** `Faites connaître votre activité au public gabonais`

**Texte :**

> Diffusez votre publicité sur Trouve Ton Nkama avec une image ou une vidéo,
> dirigez les clients vers votre WhatsApp ou votre site et suivez vos résultats.

**Preuve tarifaire :** `À partir de 3 750 FCFA pour 7 jours`

**Actions :**

- `Créer ma publicité` — action principale ;
- `Voir la vidéo` — action secondaire.

**Visuel :** une composition montrant une vraie activité gabonaise et, à côté,
un aperçu lisible de sa publicité telle qu'elle apparaît dans l'application.
Le visuel doit démontrer le produit et non servir de simple décoration.

### 3.3 Réponse à « Est-ce fait pour moi ? »

Présenter une sélection courte de cas d'usage : restaurant, boutique, beauté,
transport, formation, événement, service professionnel et application. Le texte
doit préciser que l'offre n'est pas réservée aux professionnels de l'immobilier.

### 3.4 Vidéo 11 — démonstration

La vidéo marketing suivante est intégrée dans une section importante, visible
rapidement après le hero :

`apps/marketing/videos/video-11-publicite-business/final/video-11-publicite-business-final.mp4`

Titre de section : `Découvrez comment lancer votre publicité`

Texte d'introduction :

> En moins d'une minute, découvrez les formats disponibles, la création d'une
> campagne et la façon dont votre publicité apparaît sur Trouve Ton Nkama.

Exigences d'intégration :

- copier ou publier la vidéo dans un emplacement servi par l'application ; ne
  pas référencer directement le dossier de fabrication `apps/marketing` en
  production ;
- lecteur vertical centré, dimension réservée avant chargement pour éviter un
  saut de page ;
- image d'affiche nette présentant le produit et un bouton lecture explicite ;
- contrôles lecture/pause, volume, plein écran et durée accessibles ;
- sous-titres français au format WebVTT ;
- transcription textuelle disponible sous le lecteur pour l'accessibilité et
  l'indexation ;
- ne jamais démarrer automatiquement avec le son ;
- charger la vidéo seulement lorsque la section approche de la zone visible ;
- fournir une version MP4 web optimisée et, si utile, WebM ;
- après la lecture, afficher `Créer ma publicité`.

### 3.5 Où la publicité apparaît

Montrer de vrais aperçus, sur mobile et ordinateur, avec le label
**Sponsorisé** :

- dans les résultats de recherche ;
- sur une page d'annonce ;
- sur la page d'accueil et les pages immobilières selon le forfait ;
- dans le fil des Réels pour les images verticales ou les vidéos.

Une publicité vidéo destinée aux Réels doit être montrée dans un téléphone
vertical. Éviter les maquettes grises ou les captures contenant une erreur, un
solde nul ou des données de test visibles.

### 3.6 Comment ça marche

Limiter le parcours à quatre étapes :

1. `Choisissez votre forfait` — durée et emplacements ;
2. `Ajoutez votre publicité` — image ou vidéo, texte et destination ;
3. `Vérifiez l'aperçu et payez` — montant clairement affiché en FCFA ;
4. `Suivez les résultats` — vues, clics et jours restants.

Chaque étape doit comporter un exemple visuel concret. Le texte doit rester
compréhensible sans vocabulaire d'enchère, de CPM, de pixel ou de ciblage avancé.

### 3.7 Tarifs

Afficher les forfaits sous forme de cartes faciles à comparer. Le prix principal
est toujours en FCFA ; la durée et les emplacements sont visibles sans ouvrir de
détail.

Exemple de présentation à synchroniser avec la configuration réelle :

| Forfait | Durée | Diffusion | Prix public indicatif |
|---|---:|---|---:|
| Découverte | 7 jours | Résultats de recherche | À partir de 3 750 FCFA |
| Visibilité | 14 jours | Recherche et pages détail | Équivalent FCFA du forfait actif |
| Réels | 14 jours | Image verticale ou vidéo dans les Réels | Équivalent FCFA du forfait actif |
| Marque | 30 jours | Tous les emplacements | Équivalent FCFA du forfait actif |

Les montants ne doivent pas être recopiés en dur à plusieurs endroits. La page
doit les recevoir d'une source partagée avec le tunnel de création. Si le taux
crédit/FCFA dépend du pack acheté, afficher un montant exact payable ou la mention
`à partir de`, accompagnée d'une explication courte et transparente.

### 3.8 Bénéfices et réassurance

Mettre en avant des bénéfices vérifiables :

- audience locale intéressée par les services et opportunités au Gabon ;
- démarrage avec un petit budget ;
- lien direct vers WhatsApp, téléphone ou site ;
- formats image et vidéo ;
- suivi des vues et des clics ;
- validation des publicités avant diffusion pour protéger la qualité du service.

Ne pas afficher de faux compteurs, témoignages inventés, nombre d'utilisateurs
non vérifié ou promesse de ventes garanties.

### 3.9 FAQ

Répondre au minimum à ces questions :

1. À qui s'adresse Trouve Ton Nkama Publicité ?
2. Faut-il proposer un bien immobilier ? — Non.
3. Où ma publicité sera-t-elle affichée ?
4. Puis-je publier une vidéo dans les Réels ?
5. Quel est le tarif minimum ?
6. Puis-je diriger les clients vers WhatsApp ?
7. Dois-je avoir un compte ? — Non pour consulter `/publicite`, oui pour créer
   et suivre une campagne.
8. Comment puis-je suivre les résultats ?
9. Combien de temps faut-il pour valider une publicité ?
10. Quels contenus sont refusés ?

### 3.10 Dernier appel à l'action

**Titre :** `Prêt à faire connaître votre activité ?`

**Texte :** `Créez votre campagne à partir de 3 750 FCFA et présentez votre offre au public gabonais.`

**Bouton :** `Créer ma publicité`

Ajouter un moyen d'assistance WhatsApp distinct pour les personnes qui ont une
question, sans en faire une étape obligatoire du parcours self-service.

## 4. Direction visuelle et qualité UX

- Reprendre l'identité de Trouve Ton Nkama : turquoise profond, surfaces claires
  et accent jaune utilisé avec parcimonie pour le tarif ou une preuve importante.
- Donner la priorité aux captures nettes du produit et aux activités locales
  réalistes ; éviter les grands aplats vides et les maquettes génériques.
- Un seul bouton primaire par section.
- Corps de texte de 16 px minimum, contraste WCAG AA, zones tactiles d'au moins
  44 × 44 px et focus clavier visible.
- Mise en page mobile-first, sans défilement horizontal, puis adaptation tablette
  et ordinateur dans un conteneur cohérent.
- Animations courtes et fonctionnelles ; respecter `prefers-reduced-motion`.
- Optimiser les images en AVIF/WebP, déclarer leurs dimensions et différer les
  médias situés sous la ligne de flottaison.
- Prévoir un bouton d'action mobile fixe en bas uniquement s'il ne masque aucun
  contenu ni contrôle du lecteur vidéo.

## 5. Accès et découvrabilité sans connexion

Pour rendre la page facile à trouver :

- ajouter `Faire de la publicité` ou `Publicité` dans le pied de page public ;
- ajouter une entrée adaptée dans le menu principal ou le menu mobile ;
- placer un lien depuis les emplacements portant le label `Sponsorisé`, par
  exemple `Pourquoi cette publicité ?` puis `Faire de la publicité` ;
- ajouter un lien depuis les pages destinées aux professionnels ;
- utiliser directement `https://tonnkama.com/publicite` dans la bio des réseaux
  sociaux, les publications, les statuts WhatsApp et la vidéo 11 ;
- créer un QR code pointant vers cette URL pour les supports physiques ;
- conserver une URL courte, stable, sans paramètre obligatoire ;
- suivre les campagnes externes avec des paramètres UTM, sans modifier l'URL
  canonique de la page.

## 6. SEO — possibilité d'apparaître sur Google

Oui, `/publicite` **peut** apparaître lorsqu'une personne recherche un service
pour faire une campagne publicitaire au Gabon. Ce n'est toutefois jamais garanti :
Google décide du classement selon la pertinence du contenu, l'indexabilité, la
qualité de la page, l'autorité du site, les liens et la concurrence.

La page doit cibler une intention locale et commerciale précise, par exemple :

- `faire de la publicité au Gabon` ;
- `campagne publicitaire Gabon` ;
- `publicité en ligne Gabon` ;
- `promouvoir son entreprise au Gabon` ;
- `publicité vidéo Gabon` ;
- `faire connaître son commerce à Libreville`.

Ces expressions doivent être intégrées naturellement dans les titres, le texte,
la FAQ et les alternatives des images. Ne pas créer une succession artificielle
de mots-clés.

### Métadonnées recommandées

**Title :** `Publicité au Gabon dès 3 750 FCFA | Trouve Ton Nkama`

**Meta description :**

> Faites connaître votre entreprise au public gabonais avec une publicité image
> ou vidéo sur Trouve Ton Nkama. Campagnes dès 3 750 FCFA.

**H1 :** `Faites connaître votre activité au public gabonais`

**URL canonique :** `https://tonnkama.com/publicite`

Ajouter aussi les métadonnées Open Graph et Twitter avec une image sociale
dédiée, afin que le partage de la page sur WhatsApp et les réseaux sociaux soit
clair et attractif.

### Exigences techniques SEO

- réponse HTTP `200` sans authentification ;
- aucun `noindex` et aucun blocage dans `robots.txt` ;
- rendu serveur du titre, du H1, de l'explication, des tarifs et de la FAQ ;
- ajout de `/publicite` au sitemap XML ;
- lien interne depuis au moins l'accueil, le menu ou le pied de page ;
- balise canonique vers `/publicite` ;
- hiérarchie de titres logique, une seule balise H1 ;
- données structurées JSON-LD `Service` avec une `Offer`, complétées par
  `BreadcrumbList` ; `FAQPage` peut décrire la FAQ mais ne garantit pas un
  affichage enrichi dans Google ;
- bonnes performances Core Web Vitals malgré la présence de la vidéo ;
- image sociale et image d'affiche optimisées, avec texte alternatif pertinent ;
- suivi des impressions, clics CTA, démarrages et fins de vidéo, ouverture du
  tunnel, inscription et campagne créée.

### Mise en ligne et indexation

Après publication :

1. vérifier que l'URL publique retourne bien `200` en navigation privée ;
2. vérifier le HTML rendu, la canonical, les données structurées et le sitemap ;
3. tester la page sur mobile et avec un audit Lighthouse ;
4. soumettre l'URL dans Google Search Console avec l'outil d'inspection ;
5. demander l'indexation ;
6. suivre les requêtes, impressions, clics et positions dans Search Console ;
7. enrichir la page avec des exemples réels et obtenir des liens locaux de
   partenaires, clients, médias ou annuaires pertinents.

L'achat d'une publicité Google n'améliore pas directement le classement naturel.
Une campagne Google Ads peut apporter du trafic immédiatement pendant que le SEO
se construit, mais les deux canaux doivent être mesurés séparément.

## 7. Mesure du parcours

Événements minimaux :

| Événement | Déclencheur |
|---|---|
| `publicite_landing_viewed` | page affichée |
| `publicite_video_started` | première lecture de la vidéo 11 |
| `publicite_video_completed` | vidéo terminée |
| `publicite_cta_clicked` | clic sur un CTA, avec position et état connecté |
| `publicite_pricing_viewed` | section tarifs visible |
| `publicite_auth_started` | visiteur non connecté envoyé vers l'authentification |
| `publicite_campaign_started` | ouverture de `/advertising/create` |
| `publicite_campaign_created` | campagne créée avec succès |

Le taux principal à suivre est :

`campagnes créées / visiteurs uniques de /publicite`

Suivre aussi le passage vidéo → CTA, l'abandon à l'authentification et l'abandon
dans le formulaire de création.

## 8. Critères d'acceptation

- `/publicite` est accessible en navigation privée et sans compte.
- La proposition de valeur, le public ciblé et le prix minimum en FCFA sont
  visibles sans défilement sur les écrans courants.
- La vidéo 11 est nette, sous-titrée, contrôlable et ne joue pas de son sans action.
- Les aperçus ne contiennent aucune erreur, donnée de test ou zone grise.
- Les emplacements, formats, tarifs et résultats mesurés sont expliqués.
- Le CTA conserve une destination de retour après connexion ou inscription.
- La page est responsive, accessible au clavier et respecte le contraste AA.
- `/publicite` figure dans le sitemap et n'est pas exclue de l'indexation.
- Les métadonnées, l'image de partage, la canonical et les données structurées
  sont présentes.
- Les événements du parcours permettent de mesurer la conversion jusqu'à la
  création d'une campagne.

## 9. Hors périmètre de la landing page

- gestion d'une campagne existante ;
- achat ou historique des crédits ;
- formulaire complet de création ;
- statistiques détaillées ;
- interface de modération ;
- promesse de ventes ou de position garantie sur Google.

Ces fonctions restent dans l'espace connecté ou dans le back-office.
