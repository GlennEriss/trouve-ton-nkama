# Vidéo 2 — Parcours chercheur
**"Trouver un logement à Libreville, étape par étape"**

- Format : 9:16 vertical, 1080 x 1920 px
- Durée cible : environ 64 secondes
- Type : vraie capture mobile de l'app en localhost
- Environnement : `http://localhost:3000`
- Objectif : montrer le parcours complet d'un utilisateur qui cherche un logement
- Règle : ne pas produire la vidéo tant que ce script n'est pas validé

---

## Diagnostic

La version précédente n'était pas assez bonne parce qu'elle allait trop vite et ne racontait pas clairement le parcours.

Les problèmes :

- la recherche n'était pas assez intentionnelle ;
- les filtres étaient seulement montrés, pas vraiment utilisés ;
- on ne voyait pas clairement la sélection **Province : Estuaire** puis **Ville : Libreville** ;
- l'ouverture de l'annonce arrivait trop vite, sans logique de choix ;
- la vidéo ressemblait à une suite d'écrans, pas à une personne qui cherche.

Cette version doit être plus lente, plus lisible, plus pédagogique.

---

## Histoire

On suit une personne qui cherche un logement à Libreville.

Elle veut :

1. partir d'une recherche simple ;
2. préciser la zone ;
3. réduire les résultats avec les filtres ;
4. choisir une annonce crédible ;
5. vérifier les détails ;
6. contacter directement.

La promesse de la vidéo :

> "En quelques étapes, je passe d'une recherche vague à une annonce concrète que je peux contacter."

---

## Parcours Validé

### Etape 1 — Arriver sur la recherche

But : installer le contexte.

Action écran :

1. ouvrir `http://localhost:3000/search` ;
2. attendre que les annonces chargent ;
3. faire une pause d'une seconde sur la liste.

Voix off :

> "Quand vous cherchez un logement, commencez par ouvrir la recherche."

Overlay :

> **Recherche logement**

Durée : 4 secondes.

---

### Etape 2 — Saisir le besoin

But : montrer que l'utilisateur exprime ce qu'il cherche.

Action écran :

1. cliquer dans la barre de recherche ;
2. taper lentement `appartement` ;
3. attendre une demi-seconde ;
4. laisser les résultats se stabiliser ;
5. scroller lentement sur les résultats pour montrer 2 ou 3 annonces ;
6. remonter légèrement vers le haut pour revenir au bouton filtre.

Important :

- ne pas taper `appartement Libreville` ici, parce que Libreville sera choisi proprement dans les filtres ;
- garder cette étape simple pour que la suite ait du sens ;
- le scroll doit rester lent : le spectateur doit voir les cartes, les photos et les prix.

Voix off :

> "Tapez d'abord le type de logement que vous cherchez."

Overlay :

> **Appartement**

Durée : 7 secondes.

---

### Etape 3 — Ouvrir les filtres

But : montrer que la recherche devient précise.

Action écran :

1. afficher une flèche overlay qui pointe vers le bouton filtre ;
2. garder la flèche environ une seconde ;
3. cliquer sur le bouton filtre ;
4. attendre que le panneau de filtres soit entièrement ouvert ;
5. ne rien scroller pendant une demi-seconde pour laisser lire l'écran.

Indication montage :

- ajouter une flèche simple, blanche ou vert clair, qui pointe vers l'icône filtre ;
- placer un petit label près de la flèche : **Filtres** ;
- retirer la flèche dès que le panneau s'ouvre ;
- ne pas masquer la barre de recherche ni les premières annonces.

Voix off :

> "Ensuite, ouvrez les filtres pour préciser votre besoin."

Overlay :

> **Affiner la recherche**

Durée : 4 secondes.

---

### Etape 4 — Sélectionner la province Estuaire

But : montrer une action claire et concrète.

Action écran :

1. aller au champ **Province** ;
2. ouvrir la liste des provinces ;
3. sélectionner **Estuaire** ;
4. faire une pause courte après la sélection.

Ce plan est obligatoire.

Voix off :

> "Choisissez d'abord la province. Ici, Estuaire."

Overlay :

> **Province : Estuaire**

Durée : 6 secondes.

---

### Etape 5 — Sélectionner la ville Libreville

But : préciser la zone recherchée.

Action écran :

1. aller au champ **Ville** ;
2. ouvrir la liste des villes ;
3. sélectionner **Libreville** ;
4. faire une pause courte après la sélection.

Ce plan est obligatoire.

Voix off :

> "Puis sélectionnez la ville. Pour cette recherche : Libreville."

Overlay :

> **Ville : Libreville**

Durée : 6 secondes.

---

### Etape 6 — Ajouter des critères utiles

But : montrer que le chercheur peut filtrer selon son budget et son besoin.

Action écran :

1. sélectionner le type de bien si le champ existe : **Appartement** ;
2. renseigner ou montrer un budget maximum ;
3. si disponible, sélectionner le nombre de chambres ;
4. ne pas multiplier les critères : deux ou trois suffisent.

Critères recommandés :

- Type : Appartement ;
- Prix maximum : 500 000 FCFA ;
- Chambres : 2 ou 3.

Voix off :

> "Ajoutez ensuite les critères importants : type de bien, budget, nombre de chambres."

Overlay :

> **Budget + type + chambres**

Durée : 7 secondes.

---

### Etape 7 — Appliquer et revenir aux résultats

But : montrer la conséquence des filtres.

Action écran :

1. cliquer sur le bouton d'application des filtres si le panneau en a un ;
2. sinon fermer le panneau proprement ;
3. revenir à la liste des annonces ;
4. attendre que les résultats soient visibles ;
5. scroller lentement sur deux annonces.

Voix off :

> "Vous revenez alors à une liste plus claire, avec les annonces qui correspondent."

Overlay :

> **Résultats adaptés**

Durée : 6 secondes.

---

### Etape 8 — Choisir une annonce

But : rendre le clic logique.

Action écran :

1. s'arrêter sur une annonce propre ;
2. laisser visible le titre, la photo, le prix et la ville ;
3. cliquer sur l'annonce.

Annonce cible recommandée :

- `/houseDetails/QOv12JIjA08LxbMmSHiq`
- annonceur : **ONDO Gerard**
- raison : l'annonceur est visible et le bouton contact est disponible.

Important :

- si le clic depuis la liste ne tombe pas sur cette annonce, utiliser l'URL directe pour la capture détail ;
- dans le montage final, le passage doit rester naturel : résultats puis fiche détail.

Voix off :

> "Quand une annonce vous intéresse, ouvrez-la pour vérifier les détails."

Overlay :

> **Voir les détails**

Durée : 4 secondes.

---

### Etape 9 — Lire la fiche détail

But : montrer que la fiche détail répond aux questions importantes.

Action écran :

1. attendre la photo principale ;
2. scroller doucement vers le titre ;
3. s'arrêter sur le prix ;
4. s'arrêter sur la localisation ;
5. s'arrêter sur le bloc annonceur **ONDO Gerard**.

Voix off :

> "Sur la fiche, vous vérifiez la photo, le prix, le quartier et la personne à contacter."

Overlay :

> **Prix, quartier, annonceur**

Durée : 8 secondes.

---

### Etape 10 — Contacter

But : terminer sur l'action concrète.

Action écran :

1. faire apparaître les boutons WhatsApp et téléphone ;
2. laisser les boutons visibles au moins deux secondes ;
3. ne pas cliquer pour éviter d'ouvrir une application externe ;
4. éventuellement faire un léger zoom au montage, mais pas pendant la capture.

Voix off :

> "Si l'annonce vous convient, vous contactez directement par WhatsApp ou par téléphone."

Overlay :

> **Contact direct**

Durée : 5 secondes.

---

### Etape 11 — CTA final

But : conclure sans refaire une vidéo de marque.

Action écran :

Fond vert simple avec :

- Trouve Ton Nkama ;
- `tonnkama.com` ;
- "Cherchez plus simplement".

Voix off :

> "Trouve Ton Nkama. Cherchez plus simplement."

Durée : 3 secondes.

---

## Timing Global

| Temps | Plan | Durée |
|-------|------|-------|
| 0:00 - 0:04 | Arrivée sur recherche | 4s |
| 0:04 - 0:11 | Saisie `appartement` + scroll résultats | 7s |
| 0:11 - 0:15 | Flèche + ouverture filtres | 4s |
| 0:15 - 0:21 | Province Estuaire | 6s |
| 0:21 - 0:27 | Ville Libreville | 6s |
| 0:27 - 0:38 | Critères utiles + appliquer | 11s |
| 0:38 - 0:46 | Résultats filtrés | 8s |
| 0:46 - 0:50 | Choix annonce | 4s |
| 0:50 - 0:56 | Fiche détail | 6s |
| 0:56 - 1:01 | Contact | 5s |
| 1:01 - 1:04 | CTA | 3s |

Durée cible : environ 64 secondes.

---

## Script Voix Off

```text
Quand vous cherchez un logement, commencez par ouvrir la recherche.

Tapez d'abord le type de logement que vous cherchez.

Ensuite, ouvrez les filtres pour préciser votre besoin.

Choisissez d'abord la province. Ici, Estuaire.

Puis sélectionnez la ville. Pour cette recherche : Libreville.

Ajoutez ensuite les critères importants : type de bien, budget, nombre de chambres.

Vous revenez alors à une liste plus claire, avec les annonces qui correspondent.

Quand une annonce vous intéresse, ouvrez-la pour vérifier les détails.

Sur la fiche, vous vérifiez la photo, le prix, le quartier et la personne à contacter.

Si l'annonce vous convient, vous contactez directement par WhatsApp ou par téléphone.

Trouve Ton Nkama. Cherchez plus simplement.
```

---

## Règles de Capture

- Ne pas enregistrer tant que le parcours n'est pas testé manuellement.
- Ne pas cliquer trop vite.
- Faire une pause après chaque sélection importante.
- La sélection **Estuaire** doit être visible.
- La sélection **Libreville** doit être visible.
- Les filtres doivent être appliqués ou fermés proprement.
- Le résultat doit montrer au moins deux annonces.
- La fiche détail doit montrer ONDO Gerard.
- Le contact doit finir sur les boutons WhatsApp/téléphone visibles.

---

## Critère de Réussite

La vidéo est réussie si, sans écouter la voix off, on comprend :

- l'utilisateur cherche un appartement ;
- il ouvre les filtres ;
- il choisit **Estuaire** ;
- il choisit **Libreville** ;
- il affine avec budget/type/chambres ;
- il revient aux résultats ;
- il ouvre une annonce ;
- il voit les détails ;
- il peut contacter directement.
