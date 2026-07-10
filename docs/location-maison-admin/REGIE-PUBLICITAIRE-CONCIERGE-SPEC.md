# Régie Publicitaire (Concierge) - Spécification Détaillée

## 1. Objectif

Définir, avant implémentation, le module **Publicité** du dashboard admin :
permettre à l'équipe (admin) de **vendre, créer, publier et suivre des
publicités d'entreprises externes** (marques, commerces, services) sur la
plateforme `location-maison`, contre paiement **en crédits**.

V1 = mode **concierge** : c'est l'**admin** qui crée et publie la campagne pour
le compte du client. Le self-serve (l'annonceur gère seul) est renvoyé en
**phase 2**.

Ce document est **documentation-only** (aucun code).

Doc plateforme associée (modèle de données, rendu, emplacements) :
`../../location-maison/documentation/feature/publicite/README.md`

## 2. Sources métier de référence (projet `location-maison`)

- `src/models/annonce.d.ts` (pattern `Promotion`, cycle de vie startDate/endDate)
- `src/models/credit-transaction.d.ts` (facturation en crédits, Airtel Money)
- `src/lib/credits/credit-packs.ts` (valeur du crédit, packs pilotés admin)
- `src/components/ads/*`, `src/lib/ads/*` (inventaire d'emplacements, AdSense fallback)
- Spec : `MONETISATION-PUBS-ADSENSE-SPEC.md` (matrice des pages/emplacements)
- RBAC : `RBAC-ROLES-PERMISSIONS.md`, `MATRICE-PERMISSIONS-ECRANS-ACTIONS.md`

## 3. Vocabulaire (distinction critique)

| Terme | Sens | Ne pas confondre avec |
|---|---|---|
| **Annonceur (immobilier)** | rôle `announcer`, poste des biens | — |
| **Promotion d'annonce** | boost payant d'un bien immo | la pub d'entreprise |
| **Annonceur publicitaire** (`Advertiser`) | entreprise externe qui paie une pub | le rôle `announcer` |
| **Campagne** (`AdCampaign`) | la pub vendue (visuel + emplacements + durée) | une `Promotion` |
| **AdSense** | pubs Google (backfill) | la régie maison |

## 4. Décisions V1

- **Concierge d'abord** (admin publie pour le client).
- **Paiement = montant en FCFA saisi par l'admin** (le client paie en direct). Les **crédits sont réservés aux utilisateurs** (promotion d'annonce ; pub self-serve = phase 2). L'admin **n'utilise pas de crédits**.
- **Emplacements** : `search_infeed`, `property_detail`, `home`, `immobilier_infeed`.

## 5. Écrans du dashboard admin

### 5.1 Liste des campagnes
- Tableau : annonceur, titre, emplacements, statut, période, crédits, impressions/clics/CTR.
- Filtres : statut, emplacement, annonceur, période (actives / programmées / terminées).
- Actions rapides : publier, mettre en pause, prolonger, dupliquer, terminer.

### 5.2 Création / édition d'une campagne
- Sélection / création de l'**annonceur publicitaire**.
- **Visuel** (upload image) + textes courts (titre, accroche).
- **CTA** : libellé + lien (`tel:`, `wa.me`, URL externe).
- **Emplacements** (multi-sélection parmi les 4).
- **Ciblage géo** optionnel (provinces / villes — réutilise la géo Gabon).
- **Durée** (forfait ou dates) → propose le **montant en FCFA** (cf. §8).
- **Aperçu** du rendu par emplacement avant publication.

### 5.3 Modération / validation
- File des campagnes `pending_review`.
- Approuver → `scheduled`/`active` ; Rejeter → `rejected` (motif obligatoire).

### 5.4 Détail campagne + métriques
- KPI : impressions, clics, CTR, jours restants, **montant payé (FCFA)**.
- Historique de statut + journal d'actions.

### 5.5 Gestion des annonceurs publicitaires
- Fiche client : nom, business, contact (tel/email/WhatsApp), notes.
- Historique des campagnes du client.

### 5.6 Barème tarifaire (config)
- Édition des **forfaits en FCFA** (durée × emplacements → montant),
  piloté en base (modifiable sans redéploiement, comme les `credit_packs`).

## 6. Cycle de vie d'une campagne

```
draft → pending_review → scheduled → active → (paused) → ended
                              └────────────→ rejected (motif)
```

- `scheduled` : validée, démarre à `startDate`.
- `active` : visible sur la plateforme.
- `paused` : retirée temporairement (admin).
- `ended` : automatique à `endDate`.

## 7. Modèle de données

Aligné avec la doc plateforme (§6) : collections `advertisers`, `ad_campaigns`.
La campagne porte un bloc **`billing`** (`mode: 'admin_amount' | 'user_credits'`).
En V1 concierge : `mode = 'admin_amount'` avec `amount` (FCFA), `paymentMethod`,
`paymentReference`, `paidAt`, `paymentStatus`. Le mode `user_credits`
(réutilisation de `credit_transactions`, `service: 'advertising_campaign'`,
`campaignId`) est réservé au **self-serve utilisateur** en phase 2.

## 8. Facturation (montant FCFA — concierge)

L'admin **ne manipule pas de crédits**. Il enregistre un **montant en FCFA** que
le client paie en direct. Ancrage marché : Facebook ≈ 700 FCFA/jour.

Barème forfaitaire proposé :

| Forfait | Durée | Emplacements | Prix (FCFA) |
|---|---|---|---|
| Découverte | 7 j | 1 | ~5 000 |
| Visibilité | 14 j | ≤ 2 | ~12 000 |
| Marque | 30 j | 4 | ~25 000 |

Flux d'encaissement V1 (concierge) :
1. Le client paie **en direct** (espèces, virement, Airtel direct…).
2. L'admin **saisit le montant payé (FCFA)** sur la campagne (`billing.amount`, `paymentMethod`, `paymentReference`, `paymentStatus = 'paid'`).
3. Traçabilité : montant + méthode + référence sur la campagne + audit admin.

> **Phase 2 (self-serve)** : ces forfaits seront vendus aux **utilisateurs en
> crédits** (1 crédit ≈ 250–400 FCFA) via le rail crédits + Airtel.

## 9. Workflow concierge (pas à pas)

1. Réception de la demande (page « Faire de la pub » / WhatsApp / contact).
2. Création de la fiche **annonceur publicitaire**.
3. Création de la **campagne** (visuel + CTA + emplacements + durée).
4. **Modération** interne du visuel.
5. **Encaissement direct** : l'admin saisit le **montant payé (FCFA)** + méthode + référence.
6. **Publication** → `active`.
7. **Suivi** des métriques ; relance / renouvellement à l'approche de `endDate`.

## 10. Endpoints cibles (fonctionnels)

- `GET    /api/admin/v1/advertising/campaigns?status=&placement=&range=`
- `POST   /api/admin/v1/advertising/campaigns`
- `PATCH  /api/admin/v1/advertising/campaigns/:id` (édition, statut, pause, prolongation)
- `POST   /api/admin/v1/advertising/campaigns/:id/publish`
- `POST   /api/admin/v1/advertising/campaigns/:id/record-payment` (montant FCFA + méthode + référence)
- `GET    /api/admin/v1/advertising/campaigns/:id/metrics?range=`
- `GET/POST/PATCH /api/admin/v1/advertising/advertisers`
- `GET/PUT /api/admin/v1/advertising/pricing` (barème forfaits)

## 11. Permissions RBAC à prévoir

- `ads_campaigns.read`
- `ads_campaigns.create`
- `ads_campaigns.update`
- `ads_campaigns.publish`
- `ads_campaigns.delete`
- `advertisers.manage`
- `ads_pricing.manage` (super_admin / operations_admin)

## 12. Mesure & reporting

Réutilise `ads_slot_events` (cf. `SCHEMA-DONNEES-ANALYTICS.md` /
`MONETISATION-PUBS-ADSENSE-SPEC.md`) avec dimension `campaign_id`
(`ad_impression`, `ad_click`). Vue admin : performance par campagne, par
annonceur, par emplacement ; CTR, jours restants, crédits consommés.

## 13. Garde-fous & conformité

- Modération obligatoire avant publication (contenu licite, non trompeur).
- Label **« Sponsorisé »** imposé côté plateforme.
- Respect des règles UX/densité communes avec AdSense.
- Audit systématique des actions sensibles (création, publication, enregistrement de paiement, rejet).

## 14. Scope V1 vs Phase 2

**V1 (concierge)**
- Gestion campagnes + annonceurs + barème par l'admin.
- Publication, pause, prolongation, métriques de base.
- Facturation en **FCFA** (montant saisi par l'admin, paiement direct).

**Phase 2**
- **Self-serve** : compte annonceur publicitaire, éditeur de campagne, paiement et modération en file.
- Ciblage avancé, A/B testing, budget/jour, facturation CPC/CPM.
