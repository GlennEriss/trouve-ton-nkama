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

## 2. Mécanique du cadeau — ✅ IMPLÉMENTÉ (modèle « argent réel + retrait », pas de crédits)

> **Décision produit finale** : le cadeau est une **seconde source de revenu réelle** pour
> l'annonceur, pas des crédits plateforme. Le donateur paie en Mobile Money (MyPayGa,
> confirmation USSD), la plateforme prélève une **commission de 15 %** à la confirmation,
> le **net** s'accumule dans un solde retirable. L'annonceur demande un **retrait**
> (minimum 10 000 FCFA, frais de 5 % déduits du versement, intégralité du disponible,
> une demande en attente à la fois) ; un admin envoie l'argent **manuellement** via son
> app MoMo puis marque la demande « versée » dans le back-office (registre, pas de payout
> automatisé). Une conversion cadeaux→crédits pourra être ajoutée PLUS TARD (le solde
> étant dérivé à la lecture, ce sera un terme de plus dans la formule).

### Paiement (implémenté)
Cloud Functions `initiateGiftPayment` (endpoint anonyme — pas de compte requis, la
confirmation USSD du donateur est le garde-fou) et `giftPaymentCallback` (webhook dédié,
même vérification HMAC-SHA512 + idempotence que le webhook crédits, helpers partagés dans
`functions/src/payments/mypayga/callback-shared.ts`). Secret dédié `MYPAYGA_GIFT_CALLBACK_URL`.
Constantes : `functions/src/payments/gifts/constants.ts` (commission 15 %, bornes 500–100 000
FCFA, anti-spam 5 pending/numéro/heure) et `apps/location-maison/src/constantes/gifts.ts`
(frais retrait 5 %, minimum 10 000 FCFA, presets UI).

### Modèle de données (implémenté)
```
gift_transactions/{transactionId}   — cycle de vie du paiement ET historique (status='success')
  id, type:'gift', reelId, announcerUid, propertyId?,
  donorPhone (local 9 chiffres), donorNetwork ('AM'|'MM'), message?,
  amountXaf (brut), commissionRate (snapshot 0.15), netAmountXaf,
  status ('pending'|'success'|'failed'), entitlementApplyState (garde d'idempotence),
  provider:'mypayga', champs provider*..., createdAt, completedAt

gift_withdrawals/{id}               — demandes de retrait
  id, announcerUid, montantXaf (= tout le disponible), feeRate (0.05), feeXaf,
  netPayoutXaf (ce que l'admin envoie), numero, reseau,
  statut ('EN_ATTENTE'|'TRAITE'|'REFUSE'), traitePar?, motifRefus?, dates
```
Sur confirmation : `reels.giftCount`/`giftTotalAmount` (brut, public) et
`users.giftTotalReceivedXaf`/`giftCountReceived` (net) incrémentés en transaction idempotente.
**Solde dérivé à la lecture** (`deriveGiftBalance`) : `disponible = net cumulé − retraits non
refusés` — REFUSE restitue, EN_ATTENTE/TRAITE débitent. Aucun accès client Firestore aux deux
collections (règles `allow read, write: if false`, tout passe par API routes/functions).

L'annonceur reçoit une notification `type: 'GIFT'` (in-app + push FCM via `sendUserPush`
généralisé) au cadeau reçu et au traitement de son retrait. Écrans : `/gifts` (annonceur :
solde, retrait, historiques) et `/dashboard/gift-withdrawals` (admin : versement manuel,
permissions `gift_withdrawals.read/process` sur finance_admin + operations_admin).

### Anonymat du donateur — tranché : pas de compte requis
Un chercheur peut offrir un cadeau **sans être connecté** — juste un numéro mobile money au
moment du paiement, comme pour un achat de pack de crédits classique. Aucune friction
d'inscription avant de soutenir une annonce.

Implications à prendre en compte pendant le développement :
- Pas de `fromUserUid` : la relation donateur↔annonce n'est pas rattachable à un profil
  utilisateur. Le compteur `giftCount`/`giftTotalAmount` sur le réel reste valide (agrégats
  anonymes), mais impossible d'afficher "12 personnes ont soutenu cette annonce" comme
  fonctionnalité de confiance (nécessiterait de compter les numéros distincts, pas des comptes).
- Anti-fraude/anti-spam : le webhook du provider de paiement (MyPayGa/Airtel, même mécanisme que
  les packs de crédits) reste la seule vérification — pas de couche `uid` authentifié
  supplémentaire. S'appuyer sur les protections déjà en place côté paiement plutôt qu'en inventer
  une nouvelle liée à l'auth.
- Rate-limiting éventuel (anti-abus) à faire par `fromPhoneNumber`/IP si besoin, pas par `uid`
  puisqu'il n'y en a pas.

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

## Décisions (tranchées)

1. **Mobicash / MyPayGa** : "Mobicash" désigne Moov Money, déjà supporté par l'intégration
   MyPayGa existante (`apps/location-maison/functions/src/payments/mypayga/config.ts`, réseau
   `MM`, numéros 062/065/066). Confirmé par lecture du code — aucune intégration séparée
   nécessaire.
2. **Anonymat du donateur** : **pas de compte requis** pour offrir un cadeau — juste un numéro
   mobile money au moment du paiement, comme pour un achat de pack de crédits. Pas de `fromUserUid`
   (voir modèle de données §2) : on perd la traçabilité par profil et l'affichage "X personnes ont
   soutenu cette annonce", l'anti-fraude repose sur le webhook du provider de paiement plutôt que
   sur une couche d'auth.
3. **Prix de l'abonnement** : **3 000–5 000 FCFA/mois**, calibré sur les packs de crédits réels en
   prod (Firestore `credit_packs` : Starter 5 crédits/2 000 FCFA, Standard 10/3 500, Avancé
   25/7 500, Premium 50/12 500) — se situe au milieu de cette fourchette. À ajuster après les
   premiers retours terrain, l'admin pilote déjà les prix dynamiquement (même modèle que les
   packs de crédits).
4. **Transcodage vidéo** : **Cloud Function maison (ffmpeg)**, pas de service tiers. Mux et
   Cloudflare Stream sont tous les deux payants dès la première minute (pas de plan gratuit
   viable en prod pour aucun des deux, vérifié juillet 2026) — écartés suite à la contrainte de ne
   pas ajouter de nouveau service payant. La Cloud Function s'appuie sur l'infra Firebase déjà
   utilisée par le projet (pas un nouveau fournisseur à onboarder), mais reste à développer
   entièrement (queue de transcodage, gestion des formats, pas de CDN streaming inclus — plus de
   travail avant le premier réel publiable qu'avec un service tiers).
5. **Durée max d'un réel** : **5 minutes**, dans le même flux vertical swipe que le reste du
   contenu. Point de vigilance conservé : c'est un format nettement plus long qu'un "reel"
   TikTok-style classique (15-60s) — la charge de modération humaine par vidéo et le coût de
   stockage/transcodage seront proportionnellement plus élevés qu'anticipé initialement dans ce
   document ; à intégrer dans le chiffrage/staffing modération avant le lancement.
