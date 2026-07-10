# Réels d'annonces, cadeaux et abonnement annonceur

## Idée de départ (résumé de la demande)

Une section "Réels" façon TikTok où les annonceurs postent des vidéos courtes de leurs biens.
Sur chaque réel : bouton WhatsApp (message pré-rempli), bouton appel, bouton cadeau (paiement
mobile money pour soutenir l'annonceur). Les cadeaux reçus sont visibles dans un dashboard
annonceur, mais consulter ce dashboard nécessite un abonnement payant — quand l'annonceur reçoit
un cadeau, il est notifié, et en cliquant sur la section il la voit floutée avec un message
l'invitant à s'abonner.

## 1. Expérience utilisateur (visiteur/chercheur)

### Feed vertical
- Nouvelle route publique (ex. `/reels`), scroll vertical plein écran, un réel = une annonce
  vidéo. Réutilise le pattern de flux déjà présent pour les annonces (pagination Algolia côté
  `location-maison`), adapté à un flux vidéo (curseur, pas de pagination classique).
- Chaque réel affiche : vidéo en lecture automatique/boucle, titre + prix + localisation de
  l'annonce (overlay, même info que `PropertyCard`), lien vers la fiche complète de l'annonce.

### Barre d'actions (droite de l'écran, style TikTok)
| Bouton | Comportement |
|---|---|
| WhatsApp | Ouvre `wa.me/<numéro annonceur>?text=<message pré-rempli>` — message : `"Bonjour, je suis intéressé par votre annonce https://tonnkama.com/houseDetails/<id>"` (utiliser le lien vers la fiche annonce, pas vers le réel lui-même, pour que le contact atterrisse sur une page avec toutes les infos) |
| Appel | `tel:<numéro annonceur>` (numéro déjà présent sur `Property`/`User`) |
| Cadeau | Ouvre un modal de sélection de montant + provider (Airtel Money / Mobicash), déclenche le paiement, crédite l'annonceur |

**Point d'attention modération** : un réel est un contenu généré par l'annonceur, comme une
annonce — doit suivre **exactement le même pattern `moderationStatus`** déjà en place
(`PENDING`→`APPROVED`/`REJECTED`, motif de rejet, notification). Ne pas inventer un second
système de modération pour la vidéo.

## 2. Mécanique du cadeau

### Paiement
Réutiliser l'infrastructure de paiement existante (`functions/src/payments/mypayga/`,
`functions/src/payments/airtel/`) plutôt que d'intégrer un nouveau prestataire pour Airtel
Money — l'intégration Airtel existe déjà. **Mobicash est à confirmer** : vérifier s'il existe
une API/agrégateur déjà supporté par MyPayGa (à vérifier — MyPayGa semble être un agrégateur
multi-opérateurs, auquel cas Mobicash pourrait déjà passer par le même webhook) avant d'envisager
une intégration directe séparée.

### Modèle de données (proposition)
```
reels (nouvelle collection)
  id, propertyId, createdBy (uid annonceur), videoUrl, thumbnailUrl,
  moderationStatus, rejectionReason, moderationReviewedAt, moderationReviewedBy,
  viewCount, giftCount, giftTotalAmount,
  createdAt, updatedAt

gifts (nouvelle collection)
  id, reelId, propertyId, toAnnouncerUid,
  fromUserUid (nullable si cadeau anonyme — à trancher),
  amount, provider ('airtel' | 'mobicash'), status ('pending'|'completed'|'failed'),
  createdAt
```
`toAnnouncerUid` reçoit une notification (`type: 'GIFT_RECEIVED'`, à ajouter à
`TypeNotification`) — in-app + push, même chemin que les notifications de modération déjà
implémentées ce trimestre.

### Question ouverte : anonymat du donateur
Un chercheur doit-il être connecté pour offrir un cadeau ? Deux options :
- **Connecté obligatoire** : plus de friction, mais traçabilité complète (utile pour la
  confiance, et pour éventuellement afficher "12 personnes ont soutenu cette annonce").
- **Anonyme (juste un numéro mobile money)** : moins de friction, conversion plus haute, mais
  moins de traçabilité/relation avec l'utilisateur donateur.
Recommandation : commencer par **connecté obligatoire** (réutilise l'auth existante, plus simple
à sécuriser côté paiement, cohérent avec le parcours "publier sans compte puis connexion à la
fin" déjà adopté ailleurs sur la plateforme) — l'anonymat peut être ajouté plus tard si la
friction s'avère être un vrai frein.

## 3. Dashboard annonceur — cadeaux reçus + paywall abonnement

- Nouvelle section dans le dashboard annonceur existant (`AdManagementPage` ou nouvelle route
  dédiée) : liste des cadeaux reçus (montant, date, éventuellement le réel associé), total cumulé.
- **Sans abonnement actif** : la section est visible dans la navigation, avec un badge de
  notification si nouveaux cadeaux (réutilise le compteur de notifications existant), mais le
  contenu (montants, historique) est **flouté** avec un CTA "S'abonner pour voir vos cadeaux".
  Le nombre total de cadeaux reçus (juste le compteur, pas le détail) peut rester visible même
  sans abonnement — ça motive l'abonnement sans totalement priver l'info.
- **Avec abonnement actif** : section en clair, export possible (cohérent avec les exports déjà
  présents côté admin pour d'autres données).

### Modèle de données abonnement (proposition)
Étendre `User`/`Person` avec :
```
subscriptionStatus: 'none' | 'active' | 'expired'
subscriptionTier: 'basic' | 'pro' | null
subscriptionExpiresAt: Timestamp | null
```
Paiement de l'abonnement via le même chemin que les crédits (`credit_transactions`/MyPayGa/Airtel)
— un abonnement peut techniquement être modélisé comme un achat de "crédit" récurrent, ou comme
une transaction dédiée `subscription_transactions`. À trancher selon si l'admin veut piloter
crédits et abonnements dans le même écran finance (probablement oui, pour la cohérence avec
`docs/location-maison-admin/FONCTIONNALITES-DASHBOARD-ADMIN.md` déjà existant) ou séparément.

## 4. Tarification et avantages de l'abonnement (hypothèse — à valider)

Pas de donnée de marché disponible dans ce repo pour fixer un prix définitif. Proposition de
point de départ, à valider sur le terrain (même logique que les autres décisions produit "à
valider" de ce dossier) :

| Palier | Prix suggéré | Accès cadeaux | Autres avantages envisageables |
|---|---|---|---|
| Gratuit | 0 FCFA | Cadeaux reçus floutés (compteur visible, détail masqué) | Publication d'annonces standard (déjà existant) |
| Pro | ~3 000–5 000 FCFA/mois (hypothèse) | Détail complet des cadeaux + historique | Badge "annonceur vérifié" sur les annonces/réels, mise en avant dans le feed Réels, statistiques d'annonce déjà existantes (`property-statistics`) incluses sans limite |

Avant de figer un prix : regarder le montant moyen des `credit_packs` déjà vendus côté admin
(`docs/location-maison-admin/MONETISATION-PUBS-ADSENSE-SPEC.md` et le module finance-credits)
pour calibrer sur un ordre de grandeur déjà accepté par les utilisateurs actuels, plutôt que de
partir d'un chiffre arbitraire.

## 5. Coûts et implications techniques (greenfield vidéo)

Aucune gestion vidéo n'existe aujourd'hui dans le code (confirmé — pas de composant/hook lié à
la vidéo dans `location-maison`). Points à trancher avant de développer, car le stockage/diffusion
vidéo coûte un ordre de grandeur de plus que les images :

- **Upload/compression** : suivre le même principe que `useImageDropzone` (compression
  client-side avant upload, déjà utilisé pour les images à `maxSizeMB: 0.3`) — pour la vidéo,
  une limite de durée stricte (15-30s ?) et une compression/transcodage sont indispensables pour
  ne pas exploser les coûts Storage/bande passante.
- **Transcodage** : Firebase Storage seul ne transcode pas — soit une Cloud Function déclenchée à
  l'upload (ffmpeg), soit un service tiers (Mux, Cloudflare Stream) plus simple à opérer mais
  facturé à l'usage. À chiffrer avant de choisir, avec un budget mensuel plafond explicite.
- **Diffusion** : servir des vidéos directement depuis Firebase Storage fonctionne mais sans CDN
  optimisé pour le streaming — à surveiller dès que le volume de réels grossit.

## Ce qui reste à trancher avant de scoper le développement

1. Mobicash passe-t-il déjà par MyPayGa, ou faut-il une intégration séparée ?
2. Cadeau anonyme ou compte obligatoire ?
3. Prix et paliers d'abonnement définitifs.
4. Transcodage vidéo : Cloud Function maison vs service tiers (Mux/Cloudflare Stream) — arbitrage
   coût/complexité à faire avant de commencer le développement.
5. Durée max d'un réel et politique de modération vidéo (la modération humaine actuelle
   fonctionne pour des photos/texte — visionner des vidéos prend plus de temps admin, à anticiper
   dans la charge de modération).
